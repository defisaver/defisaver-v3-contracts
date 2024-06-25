// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { MainnetMerklAddresses } from "./MainnetMerklAddresses.sol";
import { IMerklDistributor } from "../../../interfaces/merkel/IMerklDistributor.sol";

contract MerklHelper is MainnetMerklAddresses {
    IMerklDistributor internal constant merklDistributor = IMerklDistributor(MERKL_DISTRIBUTOR_ADDRESS);
}