// SPDX-License-Identifier: MIT

pragma solidity =0.8.27;

import { DFSExchangeData } from "../../exchangeV3/DFSExchangeData.sol";

abstract contract IOffchainWrapper is DFSExchangeData {
    function takeOrder(
        ExchangeData memory _exData
    ) virtual public payable returns (bool success, uint256);
}
