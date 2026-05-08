// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

import { ActionBase } from "../../contracts/actions/ActionBase.sol";
import { DFSSell } from "../../contracts/actions/exchange/DFSSell.sol";
import { DFSExchangeData } from "../../contracts/exchangeV3/DFSExchangeData.sol";
import { GasFeeTaker } from "../../contracts/actions/fee/GasFeeTaker.sol";
import { CompV3RatioCheck } from "../../contracts/actions/checkers/CompV3RatioCheck.sol";
import { IFlashLoanBase } from "../../contracts/interfaces/flashloan/IFlashLoanBase.sol";
import { SumInputs } from "../../contracts/actions/utils/SumInputs.sol";
import { PullToken } from "../../contracts/actions/utils/PullToken.sol";
import { SendToken } from "../../contracts/actions/utils/SendToken.sol";
import { SendTokensAndUnwrap } from "../../contracts/actions/utils/SendTokensAndUnwrap.sol";
import { RenzoStake } from "../../contracts/actions/renzo/RenzoStake.sol";
import { MorphoTokenWrap } from "../../contracts/actions/morpho-blue/MorphoTokenWrap.sol";
import { PendleTokenRedeem } from "../../contracts/actions/pendle/PendleTokenRedeem.sol";
import { CreateSub } from "../../contracts/actions/utils/CreateSub.sol";
import { ToggleSub } from "../../contracts/actions/utils/ToggleSub.sol";
import { StrategyModel } from "../../contracts/core/strategy/StrategyModel.sol";
import { HandleAuth } from "../../contracts/actions/utils/HandleAuth.sol";
import { SummerfiUnsub } from "../../contracts/actions/summerfi/SummerfiUnsub.sol";
import { SummerfiUnsubV2 } from "../../contracts/actions/summerfi/SummerfiUnsubV2.sol";
import { TokenizedVaultAdapter } from "../../contracts/actions/utils/TokenizedVaultAdapter.sol";

contract ActionsUtils {
    // @dev Change this value if we ever need to add more parameters to any action.
    uint256 internal constant MAX_PARAM_MAPPING_SIZE = 15;

    bytes32[] internal subData = new bytes32[](0);
    uint8[] internal paramMapping = new uint8[](MAX_PARAM_MAPPING_SIZE);
    bytes32[] internal returnValues = new bytes32[](0);

    enum FLSource {
        EMPTY,
        AAVEV2,
        BALANCER,
        GHO,
        MAKER,
        AAVEV3,
        UNIV3,
        SPARK,
        MORPHO_BLUE,
        CURVEUSD,
        BALANCER_V3
    }

    function executeActionCalldata(bytes memory _paramsCalldata, bool _isDirect)
        public
        view
        returns (bytes memory callData)
    {
        if (_isDirect) {
            callData =
                abi.encodeWithSelector(ActionBase.executeActionDirect.selector, _paramsCalldata);
        } else {
            callData = abi.encodeWithSelector(
                ActionBase.executeAction.selector,
                _paramsCalldata,
                subData,
                paramMapping,
                returnValues
            );
        }
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

        DFSSell.Params memory params =
            DFSSell.Params({ exchangeData: sellParams, from: _from, to: _to });

        return abi.encode(params);
    }

    /// @notice sellEncode for Uniswap V3 wrapper
    function sellEncodeV3(
        address _srcAddr,
        address _destAddr,
        uint256 _srcAmount,
        address _from,
        address _to,
        address _wrapper,
        uint24 _fee
    ) public view returns (bytes memory) {
        DFSExchangeData.OffchainData memory offchain;

        bytes memory wrapperData = abi.encodePacked(_srcAddr, _fee, _destAddr);

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

        DFSSell.Params memory params =
            DFSSell.Params({ exchangeData: sellParams, from: _from, to: _to });

        return abi.encode(params);
    }

    function gasFeeEncode(uint256 _gasUsed, address _feeToken) public pure returns (bytes memory) {
        GasFeeTaker.GasFeeTakerParams memory params = GasFeeTaker.GasFeeTakerParams({
            gasUsed: _gasUsed, feeToken: _feeToken, availableAmount: 0, dfsFeeDivider: 0
        });

        return abi.encode(params);
    }

    function flActionEncode(address _tokenAddr, uint256 _amount, FLSource _flSource)
        public
        pure
        returns (bytes memory)
    {
        address[] memory tokens = new address[](1);
        tokens[0] = _tokenAddr;

        uint256[] memory amounts = new uint256[](1);
        amounts[0] = _amount;

        uint256[] memory modes = new uint256[](0);

        /// @dev modes are used for aave and spark
        if (
            _flSource == FLSource.AAVEV2 || _flSource == FLSource.AAVEV3
                || _flSource == FLSource.SPARK
        ) {
            modes = new uint256[](1);
            modes[0] = 0;
        }

        /// @dev gho uses hardcoded gho token and maker uses hardcoded dai so we don't need to pass tokens
        if (_flSource == FLSource.GHO || _flSource == FLSource.MAKER) {
            tokens = new address[](0);
        }

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

    function flUniswapEncode(
        address _token0,
        address _token1,
        address _pool,
        uint256 _amount0,
        uint256 _amount1
    ) public pure returns (bytes memory) {
        address[] memory tokens = new address[](3);
        tokens[0] = _token0;
        tokens[1] = _token1;
        tokens[2] = _pool;

        uint256[] memory amounts = new uint256[](2);
        amounts[0] = _amount0;
        amounts[1] = _amount1;

        IFlashLoanBase.FlashLoanParams memory params = IFlashLoanBase.FlashLoanParams({
            tokens: tokens,
            amounts: amounts,
            modes: new uint256[](0),
            onBehalfOf: address(0),
            flParamGetterAddr: address(0),
            flParamGetterData: abi.encodePacked(uint8(FLSource.UNIV3)),
            recipeData: ""
        });

        return abi.encode(params);
    }

    function sumInputsEncode(uint256 _a, uint256 _b) public pure returns (bytes memory params) {
        params = abi.encode(SumInputs.Params({ a: _a, b: _b }));
    }

    function pullTokenEncode(address _tokenAddr, address _from, uint256 _amount)
        public
        pure
        returns (bytes memory params)
    {
        params = abi.encode(
            PullToken.Params({ tokenAddr: _tokenAddr, from: _from, amount: _amount })
        );
    }

    function sendTokenEncode(address _tokeAddr, address _to, uint256 _amount)
        public
        pure
        returns (bytes memory params)
    {
        params = abi.encode(SendToken.Params({ tokenAddr: _tokeAddr, to: _to, amount: _amount }));
    }

    function renzoStakeEncode(uint256 _amount, address _from, address _to)
        public
        pure
        returns (bytes memory params)
    {
        params = abi.encode(RenzoStake.Params({ amount: _amount, from: _from, to: _to }));
    }

    function sendTokensAndUnwrapEncode(
        address[] memory _tokens,
        address[] memory _receivers,
        uint256[] memory _amounts
    ) public pure returns (bytes memory params) {
        params = abi.encode(
            SendTokensAndUnwrap.Params({
                tokens: _tokens, receivers: _receivers, amounts: _amounts
            })
        );
    }

    function morphoTokenWrapEncode(address _to, uint256 _amount)
        public
        pure
        returns (bytes memory params)
    {
        params = abi.encode(MorphoTokenWrap.Params({ to: _to, amount: _amount }));
    }

    function pendleTokenRedeemEncode(
        address _market,
        address _underlyingToken,
        address _from,
        address _to,
        uint256 _ptAmount,
        uint256 _minAmountOut
    ) public pure returns (bytes memory params) {
        params = abi.encode(
            PendleTokenRedeem.Params({
                market: _market,
                underlyingToken: _underlyingToken,
                from: _from,
                to: _to,
                ptAmount: _ptAmount,
                minAmountOut: _minAmountOut
            })
        );
    }

    function createSubEncode(StrategyModel.StrategySub memory _sub)
        public
        pure
        returns (bytes memory params)
    {
        params = abi.encode(CreateSub.Params({ sub: _sub }));
    }

    function toggleSubEncode(uint256 _subId, bool _active)
        public
        pure
        returns (bytes memory params)
    {
        params = abi.encode(ToggleSub.Params({ subId: _subId, active: _active }));
    }

    function handleAuthEncode(bool _enableAuth) public pure returns (bytes memory params) {
        params = abi.encode(HandleAuth.Params({ enableAuth: _enableAuth }));
    }

    function SummerfiUnsubEncode(uint256[] memory _cdpIds, uint256[] memory _triggerIds)
        public
        pure
        returns (bytes memory params)
    {
        params = abi.encode(SummerfiUnsub.Params({ cdpIds: _cdpIds, triggerIds: _triggerIds }));
    }

    function SummerfiUnsubV2Encode(
        uint256[][] memory _triggerIds,
        bytes[][] memory _triggerData,
        bool[] memory _removeAllowance
    ) public pure returns (bytes memory params) {
        params = abi.encode(
            SummerfiUnsubV2.Params({
                triggerIds: _triggerIds,
                triggerData: _triggerData,
                removeAllowance: _removeAllowance
            })
        );
    }

    function tokenizedVaultAdapterEncode(
        uint256 _amount,
        uint256 _minOutOrMaxIn,
        address _vaultAddress,
        address _from,
        address _to,
        TokenizedVaultAdapter.OperationId _operationId
    ) public pure returns (bytes memory params) {
        params = abi.encode(
            TokenizedVaultAdapter.Params({
                amount: _amount,
                minOutOrMaxIn: _minOutOrMaxIn,
                vaultAddress: _vaultAddress,
                from: _from,
                to: _to,
                operationId: _operationId
            })
        );
    }
}

