// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { DFSExchangeData } from "../../exchangeV3/DFSExchangeData.sol";

interface IOffchainWrapper {
    function takeOrder(DFSExchangeData.ExchangeData memory _exData) external payable returns (bool success, uint256);
}
