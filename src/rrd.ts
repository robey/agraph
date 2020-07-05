import { range } from "./arrays";
import { TimeSeries } from "./time_series";

const COOKIE_FLOAT = 8.642135e+130;

/*
 * format of an RRD file:
 *   - header
 *       - magic: u8[4]         -- "RRD\0"
 *       - version: u8[5]       -- why 5?! don't question it!
 *       - cookie: f64          -- ✨ aligned ✨, so at offset 12 or 16
 *       - data_source_count: int
 *       - rra_count: int
 *       - pdp_step: int        -- seconds
 *       - unused: f64[10]
 *   - data_series headers: (x data_source_count)
 *       - name: u8[20]
 *       - type: u8[20]
 *       - options: f64[10]     -- we don't care about any of them
 *   - RRA headers: (x rra_count)
 *       - name: u8[20]
 *       - row_count: int
 *       - pdp_count: int       -- how many PDPs per value
 *       - options: f64[10]     -- we don't care about any of them
 *   - update header
 *       - last_sec: int        -- time last file was updated
 *       - last_usec: int
 *   - data_series configs: (x data_source_count)
 *       - last_data: u8[30]
 *       - scratch: f64[10]
 *   - RRA per data_series configs: (x data_source_count x rra_count)
 *       - scratch: f64[10]
 *   - current row per RRA: (x rra_count)
 *       - row_index: int
 *   - actual data
 *       - data: f64[row_count][rra_count]
 *
 * notes:
 *   - the int fields can be u32 or u64, ✨ you figure it out ✨
 *   - the f64 cookie should tell us which endian we're dealing with
 *   - RRA = "round robin archive"
 *   - PDP = "primary data point" (vs CDP "consolidated data point")
 *   - the data is in grids, one per RRA, each row being f64 x ds_count
 *   - in theory, data points could be ints? the file format bends over
 *     backward to allow this, but everyone seems to assume all data is f64.
 */

export interface DataSource {
  index: number;
  name: string;
  type: string;
}

export interface Archive {
  index: number;
  name: string;
  rows: number;
  stepCount: number;
  currentRow: number;

  // computed:
  offset: number;
  startTime: number;
}

export class RrdFile {
  offset: number = 0;

  version: string = "";
  littleEndian = true;

  floatAlign: number = 0;
  intAlign: number = 0;
  intIs64: boolean = false;

  dsCount: number = 0;
  archiveCount: number = 0;
  pdpStep: number = 0;
  lastUpdate: number = 0;

  dataSources: DataSource[] = [];
  archives: Archive[] = [];

  constructor(public data: DataView) {
    this.validate();
    this.readHeader();
    this.parse();
  }

  toString(): string {
    const version = parseInt(this.version, 10);
    const endian = this.littleEndian ? "LE" : "BE";
    const iSize = this.intIs64 ? 64 : 32;

    return `RrdFile(${endian}, version=${version}, sources=${this.dsCount}, archives=${this.archiveCount}, ` +
      `lastUpdate=${this.lastUpdate}, step=${this.pdpStep}, ` +
      `int=${iSize}:${this.intAlign}, float=64:${this.floatAlign})`;
  }

  /*
   * return the list of timeseries in this RRD database. the names are of
   * the form `<data-source>:<archive-name>` and can be used to fetch a
   * TimeSeries from `getTimeSeries()`.
   */
  getKeys(): string[] {
    return ([] as string[]).concat(...this.dataSources.map(ds => {
      return this.archives.filter(a => a.stepCount == 1).map(a => {
        return `${ds.name}:${a.name}`;
      });
    }));
  }

  private validate() {
    if (this.data.byteLength < 16) throw new Error("Truncated RRD");
    this.offset = 0;
    if (this.readAscii(4) != "RRD") throw new Error("Not an RRD file");
    this.version = this.readAscii(5);
    if ([ "0001", "0003", "0004" ].indexOf(this.version) < 0) {
      throw new Error(`Unknown RRD version ${this.version}`);
    }
  }

  private readHeader() {
    // read magic float
    if (this.data.getUint32(12, this.littleEndian) == 0) {
      // 64-bit alignment
      this.floatAlign = 8;
      this.offset = 16;
      if (this.data.getFloat64(this.offset, true) == COOKIE_FLOAT) {
        this.littleEndian = true;
      } else if (this.data.getFloat64(this.offset, false) == COOKIE_FLOAT) {
        this.littleEndian = false;
      } else {
        throw new Error("RRD is missing magic float");
      }

      if (this.data.getInt32(this.offset + 8 + 4, this.littleEndian) == 0) {
        this.intAlign = 8;
        this.intIs64 = true;
      } else {
        this.intAlign = 4;
        this.intIs64 = false;
      }
    } else {
      this.floatAlign = 4;
      this.offset = 12;
      this.intAlign = 4;
      this.intIs64 = false;
      if (this.data.getFloat64(this.offset, true) == COOKIE_FLOAT) {
        this.littleEndian = true;
      } else if (this.data.getFloat64(this.offset, false) == COOKIE_FLOAT) {
        this.littleEndian = false;
      } else {
        throw new Error("RRD is missing magic float");
      }
    }

    this.offset += 8;
    this.dsCount = this.readInt();
    this.archiveCount = this.readInt();
    this.pdpStep = this.readInt();
    // skip 10x f64:
    this.alignFloat();
    this.offset += 10 * 8;

    if (this.dsCount == 0 || this.archiveCount == 0 || this.pdpStep == 0) throw new Error("RRD file is corrupted");
  }

  private parse() {
    this.dataSources = range(0, this.dsCount).map(i => {
      const name = this.readAscii(20);
      const type = this.readAscii(20);
      this.alignFloat();
      this.offset += 10 * 8;
      return { index: i, name, type };
    });
    this.archives = range(0, this.archiveCount).map(i => {
      const name = this.readAscii(20);
      const rows = this.readInt();
      const stepCount = this.readInt();
      this.alignFloat();
      this.offset += 10 * 8;
      return { index: i, name, rows, stepCount, currentRow: 0, offset: -1, startTime: -1 };
    });

    this.lastUpdate = this.readInt();
    this.lastUpdate += (this.readInt() / Math.pow(10, 6));
    // so, uh, really, realistically, this is clamped to the step count.
    this.lastUpdate = Math.floor(this.lastUpdate / this.pdpStep) * this.pdpStep;

    // skip un-interesting configs.
    // (30 moves to 32 at both 4 & 8 alignment, so we can skip alignment checks.)
    this.offset += this.dsCount * (32 + 8 * 10);
    this.offset += this.dsCount * this.archiveCount * 8 * 10;

    this.archives.forEach(archive => {
      archive.currentRow = this.readInt();
    });

    // everything else in the file is data tables. calculate each archive's offset.
    this.archives.forEach(a => {
      a.offset = this.offset;
      this.offset += a.rows * 8 * this.dsCount;
      a.startTime = this.lastUpdate - a.stepCount * this.pdpStep * (a.rows - 1);
    });
  }

  getTimeSeries(key: string, startTime: number, endTime: number, name?: string): TimeSeries {
    const [ dsName, archiveName ] = key.split(":");

    const ds = this.dataSources.filter(d => d.name == dsName)[0];
    // sort matching archives with finest granularity up front.
    const archives = this.archives.filter(a => a.name == archiveName).sort((a, b) => b.startTime - a.startTime);
    if (ds == null || archives.length == 0) return new TimeSeries(name ?? key);

    // pick the archive with with the start time that covers our range (if any).
    const archive = archives.filter(a => a.startTime < startTime)[0] || archives[archives.length - 1];
    const step = this.pdpStep * archive.stepCount;

    // clamp start time and end time to actual db values.
    if (startTime < archive.startTime) startTime = archive.startTime;
    if (endTime > this.lastUpdate) endTime = this.lastUpdate + step;

    // make sure both start & end times are clamped to the steps used by this archive
    const startDist = this.lastUpdate - startTime;
    startTime = this.lastUpdate - Math.floor(startDist / step) * step;
    const endDist = this.lastUpdate - endTime;
    endTime = this.lastUpdate - Math.ceil(endDist / step) * step;

    let firstRow = (startTime - archive.startTime) / step + archive.currentRow + 1;
    if (firstRow >= archive.rows) firstRow -= archive.rows;
    const stride = this.dsCount * 8;

    const timestamps = range(startTime, endTime, step);
    const values = range(0, timestamps.length).map(i => {
      if (firstRow + i >= archive.rows) firstRow -= archive.rows;
      const offset = archive.offset + (firstRow + i) * stride;
      const d = this.data.getFloat64(offset, this.littleEndian);
      return isNaN(d) ? undefined : d;
    });
    return TimeSeries.fromArrays(name ?? key, timestamps, values);
  }

  private readAscii(length: number): string {
    let rv = "";
    let start = this.offset;
    const end = this.offset + length;
    while (end > start && this.data.getUint8(start) != 0) {
      rv += String.fromCharCode(this.data.getUint8(start));
      start++;
    }
    this.offset += length;
    return rv;
  }

  private readInt(): number {
    this.alignInt();
    if (this.intIs64) {
      // we only ever use 32 bits. :/
      const rv = this.littleEndian ?
        this.data.getUint32(this.offset, true) :
        this.data.getUint32(this.offset + 4, false);
      this.offset += 8;
      return rv;
    }
    const rv = this.data.getUint32(this.offset, this.littleEndian);
    this.offset += 4;
    return rv;
  }

  private readFloat(): number {
    this.alignFloat();
    const rv = this.data.getFloat64(this.offset, this.littleEndian);
    this.offset += 8;
    return rv;
  }

  private alignInt() {
    if ((this.offset & (this.intAlign - 1)) != 0) {
      this.offset = Math.ceil(this.offset / this.intAlign) * this.intAlign;
    }
  }

  private alignFloat() {
    // align?
    if ((this.offset & (this.floatAlign - 1)) != 0) {
      this.offset = Math.ceil(this.offset / this.floatAlign) * this.floatAlign;
    }
  }
}
