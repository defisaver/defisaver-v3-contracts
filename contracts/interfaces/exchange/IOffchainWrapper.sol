// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { DFSExchangeData } from "../../exchangeV3/DFSExchangeData.sol";

abstract contract IOffchainWrapper is DFSExchangeData {
    function takeOrder(ExchangeData memory _exData) public payable virtual returns (bool success, uint256);
}
