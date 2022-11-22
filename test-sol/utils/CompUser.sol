// SPDX-License-Identifier: MIT
pragma solidity =0.8.10;

import "../../contracts/DS/DSProxyFactoryInterface.sol";
import "../../contracts/actions/compoundV3/CompV3Supply.sol";
import "../../contracts/actions/compoundV3/CompV3Borrow.sol";
import "../../contracts/actions/compoundV3/CompV3Withdraw.sol";
import "../../contracts/actions/compoundV3/CompV3Payback.sol";

import "../../contracts/actions/compoundV3/CompV3SubProxy.sol";

contract CompUser {
    DSProxy public proxy;
    address public proxyAddr;

    address constant FACTORY_ADDR = 0xA26e15C895EFc0616177B7c1e7270A4C7D51C997;

    constructor() {
        proxy = DSProxyFactoryInterface(FACTORY_ADDR).build();
        proxyAddr = address(proxy);
    }

    function supply(
        address _market,
        address _tokenAddr,
        uint256 _amount
    ) public {
        CompV3Supply compV3Supply = new CompV3Supply();

        CompV3Supply.Params memory params = CompV3Supply.Params({
            market: _market,
            tokenAddr: _tokenAddr,
            amount: _amount,
            from: proxyAddr,
            onBehalf: address(0)
        });

        proxy.execute(
            address(compV3Supply),
            abi.encodeWithSignature("executeActionDirect(bytes)", abi.encode(params))
        );
    }

    function borrow(address _market, uint256 _amount) public {
        CompV3Borrow compV3Borrow = new CompV3Borrow();

        CompV3Borrow.Params memory params = CompV3Borrow.Params({
            market: _market,
            amount: _amount,
            to: msg.sender,
            onBehalf: address(0)
        });

        proxy.execute(
            address(compV3Borrow),
            abi.encodeWithSignature("executeActionDirect(bytes)", abi.encode(params))
        );
    }

    function subToAutomationBundles(
        address _subProxy,
        uint128 _minRatio,
        uint128 _maxRatio,
        uint128 _targetRatioBoost,
        uint128 _targetRatioRepay
    ) public returns (CompV3SubProxy.CompV3SubData memory params) {
        address USDC_ADDR = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;
        address COMET_USDC = 0xc3d688B66703497DAA19211EEdff47f25384cdc3;

        params = CompV3SubProxy.CompV3SubData({
            market: COMET_USDC,
            baseToken: USDC_ADDR,
            minRatio: _minRatio,
            maxRatio: _maxRatio,
            targetRatioBoost: _targetRatioBoost,
            targetRatioRepay: _targetRatioRepay,
            boostEnabled: true,
            isEOA: false
        });

        proxy.execute(
            address(_subProxy),
            abi.encodeWithSignature(
                "subToCompV3Automation((address,address,uint128,uint128,uint128,uint128,bool,bool))",
                params
            )
        );
    }

    function executeWithProxy(address _target, bytes memory _funcCalldata) public {
        proxy.execute(_target, _funcCalldata);
    }
}
