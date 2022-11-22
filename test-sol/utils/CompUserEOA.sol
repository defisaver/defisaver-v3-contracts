// SPDX-License-Identifier: MIT
pragma solidity =0.8.10;

import "../../contracts/interfaces/compoundV3/IComet.sol";
import "../../contracts/DS/DSProxyFactoryInterface.sol";
import "../../contracts/actions/compoundV3/CompV3Supply.sol";
import "../../contracts/actions/compoundV3/CompV3Borrow.sol";
import "../../contracts/actions/compoundV3/CompV3Withdraw.sol";
import "../../contracts/actions/compoundV3/CompV3Payback.sol";
import "../../contracts/actions/compoundV3/CompV3SubProxy.sol";

contract CompUserEOA {
    DSProxy public proxy;
    address public proxyAddr;
    IComet public comet;

    address constant FACTORY_ADDR = 0xA26e15C895EFc0616177B7c1e7270A4C7D51C997;

    constructor(address _comet) {
        proxy = DSProxyFactoryInterface(FACTORY_ADDR).build();
        proxyAddr = address(proxy);
        comet = IComet(_comet);

        // gib allow to proxy
        comet.allow(address(proxy), true);
    }

    function supply(
        address _tokenAddr,
        uint256 _amount
    ) public {
        IERC20(_tokenAddr).approve(address(comet), type(uint256).max);

        comet.supply(_tokenAddr, _amount);
    }

    function borrow(uint256 _amount) public {
        comet.withdraw(comet.baseToken(), _amount);
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
            isEOA: true
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
