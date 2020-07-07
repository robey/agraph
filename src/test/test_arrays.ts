import { arrayGrouped, range } from "../arrays";

import "should";
import "source-map-support/register";

describe("arrays", () => {
  it("range", () => {
    range(3, 6).should.eql([ 3, 4, 5 ]);
    range(4, 20, 3).should.eql([4, 7, 10, 13, 16, 19]);
  });

  it("arrayGrouped", () => {
    arrayGrouped([ 1, 2, 3, 4, 5, 6, 7 ], 7).should.eql([ [ 1, 2, 3, 4, 5, 6, 7 ] ]);
    arrayGrouped([ 1, 2, 3, 4, 5, 6, 7 ], 3).should.eql([ [ 1, 2, 3 ], [ 4, 5, 6 ], [ 7 ] ]);
    arrayGrouped([ 1, 2, 3, 4, 5, 6, 7 ], 2).should.eql([ [ 1, 2 ], [ 3, 4 ], [ 5, 6 ], [ 7 ] ]);
    arrayGrouped([ 1, 2, 3, 4, 5, 6, 7 ], 1).should.eql([ [ 1 ], [ 2 ], [ 3 ], [ 4 ], [ 5 ], [ 6 ], [ 7 ] ]);
  });
});
