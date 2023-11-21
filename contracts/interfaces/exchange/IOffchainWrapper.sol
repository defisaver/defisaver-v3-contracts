// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;

import "../../exchangeV3/DFSExchangeData.sol";

abstract contract IOffchainWrapper is DFSExchangeData {
    function takeOrder(
        ExchangeData memory _exData
    ) external virtual payable returns (bool success, uint256);
}
