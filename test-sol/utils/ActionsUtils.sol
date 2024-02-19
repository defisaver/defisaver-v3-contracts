// SPDX-License-Identifier: MIT
pragma solidity =0.8.10;

import "../../contracts/actions/compoundV3/CompV3Supply.sol";
import "../../contracts/actions/compoundV3/CompV3Withdraw.sol";
import "../../contracts/actions/compoundV3/CompV3Payback.sol";
import "../../contracts/actions/compoundV3/CompV3Borrow.sol";
import "../../contracts/actions/exchange/DFSSell.sol";
import "../../contracts/actions/fee/GasFeeTaker.sol";
import "../../contracts/actions/checkers/CompV3RatioCheck.sol";
import "../../contracts/interfaces/flashloan/IFlashLoanBase.sol";
import { AaveV3Supply } from "../../contracts/actions/aaveV3/AaveV3Supply.sol";
import { AaveV3Borrow } from "../../contracts/actions/aaveV3/AaveV3Borrow.sol";
import { AaveV3Withdraw } from "../../contracts/actions/aaveV3/AaveV3Withdraw.sol";
import { AaveV3SwapBorrowRateMode } from "../../contracts/actions/aaveV3/AaveV3SwapBorrowRateMode.sol";
import { AaveV3SetEMode } from "../../contracts/actions/aaveV3/AaveV3SetEMode.sol";
import { AaveV3DelegateCredit } from "../../contracts/actions/aaveV3/AaveV3DelegateCredit.sol";

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
        uint256 amount,
        address from,
        uint16 assetId,
        bool useDefaultMarket,
        bool useOnBehalfOf,
        address market,
        address onBehalf
    ) public pure returns (bytes memory params) {
        params = abi.encode(
            AaveV3Supply.Params({
                amount: amount,
                from: from,
                assetId: assetId,
                useDefaultMarket: useDefaultMarket,
                useOnBehalf: useOnBehalfOf,
                market: market,
                onBehalf: onBehalf
            })
        );
    }

    function aaveV3BorrowEncode(
        uint256 amount,
        address to,
        uint8 rateMode,
        uint16 assetId,
        bool useDefaultMarket,
        bool useOnBehalf,
        address market,
        address onBehalf
    ) public pure returns (bytes memory params) {
        params = abi.encode(
            AaveV3Borrow.Params({
                amount: amount,
                to: to,
                rateMode: rateMode,
                assetId: assetId,
                useDefaultMarket: useDefaultMarket,
                useOnBehalf: useOnBehalf,
                market: market,
                onBehalf: onBehalf
            })
        );
    }

    function aaveV3WithdrawEncode(
        uint16 assetId,
        bool useDefaultMarket,
        uint256 amount,
        address to,
        address market
    ) public pure returns (bytes memory params) {
        params = abi.encode(
            AaveV3Withdraw.Params({
                assetId: assetId,
                useDefaultMarket: useDefaultMarket,
                amount: amount,
                to: to,
                market: market
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

}
