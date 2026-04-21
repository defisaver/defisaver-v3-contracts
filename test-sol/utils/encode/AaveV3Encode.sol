// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

import { AaveV3Supply } from "../../../contracts/actions/aaveV3/AaveV3Supply.sol";
import { AaveV3Borrow } from "../../../contracts/actions/aaveV3/AaveV3Borrow.sol";
import { AaveV3Withdraw } from "../../../contracts/actions/aaveV3/AaveV3Withdraw.sol";
import { AaveV3SetEMode } from "../../../contracts/actions/aaveV3/AaveV3SetEMode.sol";
import { AaveV3DelegateCredit } from "../../../contracts/actions/aaveV3/AaveV3DelegateCredit.sol";
import {
    AaveV3CollateralSwitch
} from "../../../contracts/actions/aaveV3/AaveV3CollateralSwitch.sol";
import { AaveV3ClaimRewards } from "../../../contracts/actions/aaveV3/AaveV3ClaimRewards.sol";
import { AaveV3Payback } from "../../../contracts/actions/aaveV3/AaveV3Payback.sol";
import { AaveV3ATokenPayback } from "../../../contracts/actions/aaveV3/AaveV3ATokenPayback.sol";
import { AaveV3RatioCheck } from "../../../contracts/actions/checkers/AaveV3RatioCheck.sol";
import { GhoStake } from "../../../contracts/actions/aaveV3/GhoStake.sol";
import { UmbrellaStake } from "../../../contracts/actions/aaveV3/umbrella/UmbrellaStake.sol";
import { UmbrellaUnstake } from "../../../contracts/actions/aaveV3/umbrella/UmbrellaUnstake.sol";

library AaveV3Encode {
    function supply(
        uint256 _amount,
        address _from,
        uint16 _assetId,
        bool _useDefaultMarket,
        bool _useOnBehalfOf,
        address _market,
        address _onBehalf
    ) public pure returns (bytes memory params) {
        params = abi.encode(
            AaveV3Supply.Params({
                amount: _amount,
                from: _from,
                assetId: _assetId,
                enableAsColl: true,
                useDefaultMarket: _useDefaultMarket,
                useOnBehalf: _useOnBehalfOf,
                market: _market,
                onBehalf: _onBehalf
            })
        );
    }

    function borrow(
        uint256 _amount,
        address _to,
        uint8 _rateMode,
        uint16 _assetId,
        bool _useDefaultMarket,
        bool _useOnBehalf,
        address _market,
        address _onBehalf
    ) public pure returns (bytes memory params) {
        params = abi.encode(
            AaveV3Borrow.Params({
                amount: _amount,
                to: _to,
                rateMode: _rateMode,
                assetId: _assetId,
                useDefaultMarket: _useDefaultMarket,
                useOnBehalf: _useOnBehalf,
                market: _market,
                onBehalf: _onBehalf
            })
        );
    }

    function withdraw(
        uint16 _assetId,
        bool _useDefaultMarket,
        uint256 _amount,
        address _to,
        address _market
    ) public pure returns (bytes memory params) {
        params = abi.encode(
            AaveV3Withdraw.Params({
                assetId: _assetId,
                useDefaultMarket: _useDefaultMarket,
                amount: _amount,
                to: _to,
                market: _market
            })
        );
    }

    function setEMode(uint8 _categoryId, bool _useDefaultMarket, address _market)
        public
        pure
        returns (bytes memory params)
    {
        params = abi.encode(
            AaveV3SetEMode.Params({
                categoryId: _categoryId, useDefaultMarket: _useDefaultMarket, market: _market
            })
        );
    }

    function delegateCredit(
        uint256 _amount,
        address _delegatee,
        uint16 _assetId,
        uint8 _rateMode,
        bool _useDefaultMarket,
        address _market
    ) public pure returns (bytes memory params) {
        params = abi.encode(
            AaveV3DelegateCredit.Params({
                amount: _amount,
                delegatee: _delegatee,
                assetId: _assetId,
                rateMode: _rateMode,
                useDefaultMarket: _useDefaultMarket,
                market: _market
            })
        );
    }

    function collateralSwitch(
        uint8 _arrayLength,
        uint16[] memory _assetIds,
        bool[] memory _useAsCollateral,
        bool _useDefaultMarket,
        address _market
    ) public pure returns (bytes memory params) {
        params = abi.encode(
            AaveV3CollateralSwitch.Params({
                arrayLength: _arrayLength,
                assetIds: _assetIds,
                useAsCollateral: _useAsCollateral,
                useDefaultMarket: _useDefaultMarket,
                market: _market
            })
        );
    }

    function claimRewards(uint256 _amount, address _to, address _reward, address[] memory _assets)
        public
        pure
        returns (bytes memory params)
    {
        params = abi.encode(
            AaveV3ClaimRewards.Params({
                amount: _amount,
                to: _to,
                reward: _reward,
                assetsLength: uint8(_assets.length),
                assets: _assets
            })
        );
    }

    function payback(
        uint256 _amount,
        address _from,
        uint8 _rateMode,
        uint16 _assetId,
        bool _useDefaultMarket,
        bool _useOnBehalf,
        address _market,
        address _onBehalf
    ) public pure returns (bytes memory params) {
        params = abi.encode(
            AaveV3Payback.Params({
                amount: _amount,
                from: _from,
                rateMode: _rateMode,
                assetId: _assetId,
                useDefaultMarket: _useDefaultMarket,
                useOnBehalf: _useOnBehalf,
                market: _market,
                onBehalf: _onBehalf
            })
        );
    }

    function aTokenPayback(
        uint256 _amount,
        address _from,
        uint8 _rateMode,
        uint16 _assetId,
        bool _useDefaultMarket,
        address _market
    ) public pure returns (bytes memory params) {
        params = abi.encode(
            AaveV3ATokenPayback.Params({
                amount: _amount,
                from: _from,
                rateMode: _rateMode,
                assetId: _assetId,
                useDefaultMarket: _useDefaultMarket,
                market: _market
            })
        );
    }

    function ratioCheck(uint8 _state, uint256 _targetRatio, address _market, address _user)
        public
        pure
        returns (bytes memory)
    {
        AaveV3RatioCheck.Params memory params = AaveV3RatioCheck.Params({
            ratioState: AaveV3RatioCheck.RatioState(_state),
            targetRatio: _targetRatio,
            market: _market,
            user: _user
        });

        return abi.encode(params);
    }

    function ghoStake(address _from, address _to, uint256 _amount)
        public
        pure
        returns (bytes memory params)
    {
        params = abi.encode(GhoStake.Params({ from: _from, to: _to, amount: _amount }));
    }

    function umbrellaStake(
        address _stkToken,
        address _from,
        address _to,
        uint256 _amount,
        bool _useATokens,
        uint256 _minSharesOut
    ) public pure returns (bytes memory params) {
        params = abi.encode(
            UmbrellaStake.Params({
                stkToken: _stkToken,
                from: _from,
                to: _to,
                amount: _amount,
                useATokens: _useATokens,
                minSharesOut: _minSharesOut
            })
        );
    }

    function umbrellaUnstake(
        address _stkToken,
        address _to,
        uint256 _stkAmount,
        bool _useATokens,
        uint256 _minAmountOut
    ) public pure returns (bytes memory params) {
        params = abi.encode(
            UmbrellaUnstake.Params({
                stkToken: _stkToken,
                to: _to,
                stkAmount: _stkAmount,
                useATokens: _useATokens,
                minAmountOut: _minAmountOut
            })
        );
    }
}
