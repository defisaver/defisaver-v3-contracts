// SPDX-License-Identifier: MIT
pragma solidity =0.8.10;

import "./CompUserUtils.sol";
import "../../../contracts/actions/compoundV3/CompV3Supply.sol";
import "../../../contracts/actions/compoundV3/CompV3Borrow.sol";

contract CompUser is CompUserUtils {

    //solhint-disable-next-line no-empty-blocks
    constructor() CompUserUtils() {}

    function supply(
        bool _isSafe,
        address _market,
        address _tokenAddr,
        uint256 _amount
    ) public {
        CompV3Supply compV3Supply = new CompV3Supply();

        CompV3Supply.Params memory params = CompV3Supply.Params({
            market: _market,
            tokenAddr: _tokenAddr,
            amount: _amount,
            from: _isSafe ? safeAddr : proxyAddr,
            onBehalf: address(0)
        });

        bytes memory fnData = abi.encodeWithSignature("executeActionDirect(bytes)", abi.encode(params));
        executeWithWallet(_isSafe, address(compV3Supply), fnData, 0);
    }

    function borrow(bool _isSafe, address _market, uint256 _amount) public {
        CompV3Borrow compV3Borrow = new CompV3Borrow();

        CompV3Borrow.Params memory params = CompV3Borrow.Params({
            market: _market,
            amount: _amount,
            to: msg.sender,
            onBehalf: address(0)
        });

        bytes memory fnData = abi.encodeWithSignature("executeActionDirect(bytes)", abi.encode(params));
        executeWithWallet(_isSafe, address(compV3Borrow), fnData, 0);
    }
}
