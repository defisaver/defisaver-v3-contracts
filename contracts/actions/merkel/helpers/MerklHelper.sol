// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;

import "./MainnetMerklAddresses.sol";
import "../../../interfaces/merkel/IMerklDistributor.sol";

contract MerklHelper is MainnetMerklAddresses {
    IMerklDistributor internal constant merklDistributor = IMerklDistributor(MERKL_DISTRIBUTOR_ADDRESS);
}