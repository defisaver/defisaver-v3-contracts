// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { ActionBase } from "../../ActionBase.sol";
import { TokenUtils } from "../../../utils/token/TokenUtils.sol";
import { UniV3Helper } from "./helpers/UniV3Helper.sol";
import {
    IUniswapV3NonfungiblePositionManager
} from "../../../interfaces/protocols/uniswap/v3/IUniswapV3NonfungiblePositionManager.sol";

/// @title Supplies liquidity to a UniswapV3 position represented by TokenId
contract UniSupplyV3 is ActionBase, UniV3Helper {
    using TokenUtils for address;

    /// @param tokenId - The ID of the token for which liquidity is being increased
    /// @param liquidity -The amount by which liquidity will be increased,
    /// @param amount0Desired - The desired amount of token0 that should be supplied,
    /// @param amount1Desired - The desired amount of token1 that should be supplied,
    /// @param amount0Min - The minimum amount of token0 that should be supplied,
    /// @param amount1Min - The minimum amount of token1 that should be supplied,
    /// @param deadline - The time by which the transaction must be included to effect the change
    /// @param from - account to take amounts from
    /// @param token0 - address of the first token
    /// @param token1 - address of the second token
    struct Params {
        uint256 tokenId;
        uint256 amount0Desired;
        uint256 amount1Desired;
        uint256 amount0Min;
        uint256 amount1Min;
        uint256 deadline;
        address from;
        address token0;
        address token1;
    }

    /// @inheritdoc ActionBase
    function executeAction(
        bytes memory _callData,
        bytes32[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public payable virtual override returns (bytes32) {
        Params memory uniData = parseInputs(_callData);

        uniData.tokenId =
            _parseParamUint(uniData.tokenId, _paramMapping[0], _subData, _returnValues);
        uniData.amount0Desired =
            _parseParamUint(uniData.amount0Desired, _paramMapping[1], _subData, _returnValues);
        uniData.amount1Desired =
            _parseParamUint(uniData.amount1Desired, _paramMapping[2], _subData, _returnValues);

        (uint128 liquidity, bytes memory logData) = _uniSupplyPosition(uniData);
        emit ActionEvent("UniSupplyV3", logData);
        return bytes32(uint256(liquidity));
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable override {
        Params memory uniData = parseInputs(_callData);
        (, bytes memory logData) = _uniSupplyPosition(uniData);
        logger.logActionDirectEvent("UniSupplyV3", logData);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    function _uniSupplyPosition(Params memory _uniData)
        internal
        returns (uint128 liquidity, bytes memory logData)
    {
        // fetch tokens from address
        uint256 amount0Pulled =
            _uniData.token0.pullTokensIfNeeded(_uniData.from, _uniData.amount0Desired);
        uint256 amount1Pulled =
            _uniData.token1.pullTokensIfNeeded(_uniData.from, _uniData.amount1Desired);

        // approve positionManager so it can pull tokens
        _uniData.token0.approveToken(address(positionManager), amount0Pulled);
        _uniData.token1.approveToken(address(positionManager), amount1Pulled);

        _uniData.amount0Desired = amount0Pulled;
        _uniData.amount1Desired = amount1Pulled;

        uint256 amount0;
        uint256 amount1;
        (liquidity, amount0, amount1) = _uniSupply(_uniData);

        //send leftovers
        _uniData.token0.withdrawTokens(_uniData.from, _uniData.amount0Desired - amount0);
        _uniData.token1.withdrawTokens(_uniData.from, _uniData.amount1Desired - amount1);

        logData = abi.encode(_uniData, liquidity, amount0, amount1);
    }
    /// @dev increases liquidity by token amounts desired
    /// @return liquidity new liquidity amount

    function _uniSupply(Params memory _uniData)
        internal
        returns (uint128 liquidity, uint256 amount0, uint256 amount1)
    {
        IUniswapV3NonfungiblePositionManager.IncreaseLiquidityParams memory
            increaseLiquidityParams =
            IUniswapV3NonfungiblePositionManager.IncreaseLiquidityParams({
                tokenId: _uniData.tokenId,
                amount0Desired: _uniData.amount0Desired,
                amount1Desired: _uniData.amount1Desired,
                amount0Min: _uniData.amount0Min,
                amount1Min: _uniData.amount1Min,
                deadline: _uniData.deadline
            });
        (liquidity, amount0, amount1) = positionManager.increaseLiquidity(increaseLiquidityParams);
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory uniData) {
        uniData = abi.decode(_callData, (Params));
    }
}
