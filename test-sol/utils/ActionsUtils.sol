// SPDX-License-Identifier: MIT
pragma solidity =0.8.10;

import { CompV3Supply } from "../../contracts/actions/compoundV3/CompV3Supply.sol";
import { CompV3Withdraw } from "../../contracts/actions/compoundV3/CompV3Withdraw.sol";
import { CompV3Payback } from "../../contracts/actions/compoundV3/CompV3Payback.sol";
import { CompV3Borrow } from "../../contracts/actions/compoundV3/CompV3Borrow.sol";
import { DFSSell } from "../../contracts/actions/exchange/DFSSell.sol";
import { DFSExchangeData } from "../../contracts/exchangeV3/DFSExchangeData.sol";
import { GasFeeTaker } from "../../contracts/actions/fee/GasFeeTaker.sol";
import { CompV3RatioCheck } from "../../contracts/actions/checkers/CompV3RatioCheck.sol";
import { IFlashLoanBase } from "../../contracts/interfaces/flashloan/IFlashLoanBase.sol";
import { AaveV3Supply } from "../../contracts/actions/aaveV3/AaveV3Supply.sol";
import { AaveV3Borrow } from "../../contracts/actions/aaveV3/AaveV3Borrow.sol";
import { AaveV3Withdraw } from "../../contracts/actions/aaveV3/AaveV3Withdraw.sol";
import { AaveV3SwapBorrowRateMode } from "../../contracts/actions/aaveV3/AaveV3SwapBorrowRateMode.sol";
import { AaveV3SetEMode } from "../../contracts/actions/aaveV3/AaveV3SetEMode.sol";
import { AaveV3DelegateCredit } from "../../contracts/actions/aaveV3/AaveV3DelegateCredit.sol";
import { AaveV3CollateralSwitch } from "../../contracts/actions/aaveV3/AaveV3CollateralSwitch.sol";
import { AaveV3ClaimRewards } from "../../contracts/actions/aaveV3/AaveV3ClaimRewards.sol";
import { AaveV3Payback } from "../../contracts/actions/aaveV3/AaveV3Payback.sol";
import { AaveV3ATokenPayback } from "../../contracts/actions/aaveV3/AaveV3ATokenPayback.sol";

contract ActionsUtils {

    bytes32[] internal subData = new bytes32[](0);
    uint8[]  internal paramMapping = new uint8[](8);
    bytes32[] internal returnValues = new bytes32[](0);

    enum FLSource {
        EMPTY,
        AAVEV2,
        BALANCER,
        GHO,
        MAKER,
        AAVEV3,
        UNIV3,
        SPARK
    }

    function compV3SupplyEncode(
        address _market,
        address _tokenAddr,
        uint256 _amount,
        address _from
    ) public pure returns (bytes memory) {
        CompV3Supply.Params memory params = CompV3Supply.Params({
            market: _market,
            tokenAddr: _tokenAddr,
            amount: _amount,
            from: _from,
            onBehalf: address(0)
        });

        return abi.encode(params);
    }

    function compV3WithdrawEncode(
        address _market,
        address _to,
        address _tokenAddr,
        uint256 _amount
    ) public pure returns (bytes memory) {
        CompV3Withdraw.Params memory params = CompV3Withdraw.Params({
            market: _market,
            to: _to,
            asset: _tokenAddr,
            amount: _amount,
            onBehalf: address(0)
        });

        return abi.encode(params);
    }

    function compV3BorrowEncode(
        address _market,
        uint _amount,
        address _to
    ) public pure returns (bytes memory) {
        CompV3Borrow.Params memory params = CompV3Borrow.Params({
            market: _market,
            amount: _amount,
            to: _to,
            onBehalf: address(0)
        });

        return abi.encode(params);
    }

    function compV3PaybackEncode(
        address _market,
        address _from,
        uint256 _amount
    ) public pure returns (bytes memory) {
        CompV3Payback.Params memory params = CompV3Payback.Params({
            market: _market,
            amount: _amount,
            from: _from,
            onBehalf: address(0)
        });

        return abi.encode(params);
    }

    function sellEncode(
        address _srcAddr,
        address _destAddr,
        uint256 _srcAmount,
        address _from,
        address _to,
        address _wrapper
    ) public view returns (bytes memory) {
        DFSExchangeData.OffchainData memory offchain;

        address[] memory path = new address[](2);
        path[0] = _srcAddr;
        path[1] = _destAddr;
        bytes memory wrapperData = abi.encode(path);

        DFSExchangeData.ExchangeData memory sellParams = DFSExchangeData.ExchangeData({
            srcAddr: _srcAddr,
            destAddr: _destAddr,
            srcAmount: _srcAmount,
            destAmount: 0,
            minPrice: 0,
            dfsFeeDivider: 0,
            user: msg.sender,
            wrapper: _wrapper,
            wrapperData: wrapperData,
            offchainData: offchain
        });

        DFSSell.Params memory params = DFSSell.Params({
            exchangeData: sellParams,
            from: _from,
            to: _to
        });

        return abi.encode(params);
    }

    function gasFeeEncode(uint256 _gasUsed, address _feeToken) public pure returns (bytes memory) {
        GasFeeTaker.GasFeeTakerParams memory params = GasFeeTaker.GasFeeTakerParams({
            gasUsed: _gasUsed,
            feeToken: _feeToken,
            availableAmount: 0,
            dfsFeeDivider: 0
        });

        return abi.encode(params);
    }

    function flBalancerEncode(
        address _tokenAddr,
        uint256 _amount
    ) public pure returns (bytes memory) {
        address[] memory tokens = new address[](1);
        tokens[0] = _tokenAddr;

        uint[] memory amounts = new uint[](1);
        amounts[0] = _amount;

        uint[] memory modes = new uint[](1);
        modes[0] = 0;

        IFlashLoanBase.FlashLoanParams memory params = IFlashLoanBase.FlashLoanParams({
            tokens: tokens,
            amounts: amounts,
            modes: modes,
            onBehalfOf: address(0),
            flParamGetterAddr: address(0),
            flParamGetterData: "",
            recipeData: ""
        });

        return abi.encode(params);
    }

    function compV3RatioCheckEncode(uint8 _state, uint _targetRatio, address _market) public pure returns (bytes memory) {
        CompV3RatioCheck.Params memory params = CompV3RatioCheck.Params({
            ratioState: CompV3RatioCheck.RatioState(_state),
            targetRatio: _targetRatio,
            market: _market,
            user: address(0)
        });

        return abi.encode(params);
    }

    function flActionEncode(
        address _tokenAddr,
        uint256 _amount,
        FLSource _flSource
    ) public pure returns (bytes memory) {
        address[] memory tokens = new address[](1);
        tokens[0] = _tokenAddr;

        uint[] memory amounts = new uint[](1);
        amounts[0] = _amount;

        uint[] memory modes = new uint[](1);
        modes[0] = 0;

        IFlashLoanBase.FlashLoanParams memory params = IFlashLoanBase.FlashLoanParams({
            tokens: tokens,
            amounts: amounts,
            modes: modes,
            onBehalfOf: address(0),
            flParamGetterAddr: address(0),
            flParamGetterData: abi.encodePacked(uint8(_flSource)),
            recipeData: ""
        });

        return abi.encode(params);
    }

    function aaveV3SupplyEncode(
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

    function aaveV3BorrowEncode(
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

    function aaveV3WithdrawEncode(
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

    function aaveV3SwapBorrowRateModeEncode(
        uint8 _rateMode,
        uint16 _assetId,
        bool _useDefaultMarket,
        address _market
    ) public pure returns (bytes memory params) {
        params = abi.encode(
            AaveV3SwapBorrowRateMode.Params({
                rateMode: _rateMode,
                assetId: _assetId,
                useDefaultMarket: _useDefaultMarket,
                market: _market
            })
        );
    }

    function aaveV3SetEModeEncode(
        uint8 _categoryId,
        bool _useDefaultMarket,
        address _market
    ) public pure returns (bytes memory params) {
        params = abi.encode(
            AaveV3SetEMode.Params({
                categoryId: _categoryId,
                useDefaultMarket: _useDefaultMarket,
                market: _market
            })
        );
    }

    function aaveV3DelegateCreditEncode(
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

    function aaveV3CollateralSwitchEncode(
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

    function aaveV3ClaimRewardsEncode(
        uint256 _amount,
        address _to,
        address _reward,
        address[] memory _assets
    ) public pure returns (bytes memory params) {
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

    function aaveV3PaybackEncode(
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

    function aaveV3ATokenPaybackEncode(
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
    
}
