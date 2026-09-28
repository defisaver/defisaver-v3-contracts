// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

import { Offer } from "./IMidnight.sol";

struct OfferFill {
    Offer offer;
    bytes ratifierData;
    uint256 units;
}
