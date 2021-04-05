// SPDX-License-Identifier: MIT

pragma solidity =0.7.6;

pragma experimental ABIEncoderV2;

import "../../exchangeV3/DFSExchangeData.sol";

abstract contract IOffchainWrapper is DFSExchangeData {
    function takeOrder(
        ExchangeData memory _exData,
        ExchangeActionType _type
    ) virtual public payable returns (bool success, uint256);
}
