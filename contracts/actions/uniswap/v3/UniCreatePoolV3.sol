// SPDX-License-Identifier: MIT

pragma solidity =0.8.4;
pragma experimental ABIEncoderV2;

import "../../../DS/DSMath.sol";
import "../../ActionBase.sol";
import "../../../utils/TokenUtils.sol";
import "../../../interfaces/uniswap/v3/IUniswapV3NonfungiblePositionManager.sol";

/// @title Action for creating Uniswap V3 Pool and minting a position in it after that
/// @notice If pool already exists, it will only mint a position in pool
contract UniCreatePoolV3 is ActionBase, DSMath {
    using TokenUtils for address;
    IUniswapV3NonfungiblePositionManager public constant positionManager =
        IUniswapV3NonfungiblePositionManager(0xC36442b4a4522E871399CD717aBDD847Ab11FE88);

    /// @param token0 The contract address of token0 of the pool
    /// @param token1 The contract address of token1 of the pool
    /// @param fee The fee amount of the v3 pool for the specified token pair
    /// @param tickLower The lower end of the tick range for the position
    /// @param tickUpper The higher end of the tick range for the position
    /// @param amount0Desired The desired amount of token0 that should be supplied
    /// @param amount1Desired The desired amount of token1 that should be supplied
    /// @param amount0Min The minimum amount of token0 that should be supplied,
    /// @param amount1Min The minimum amount of token1 that should be supplied,
    /// @param recipient address which will receive the NFT
    /// @param deadline The time by which the transaction must be included to effect the change
    /// @param from account to take amounts from
    /// @param sqrtPriceX96 The initial square root price of the pool as a Q64.96 value
    struct Params {
        address token0;
        address token1;
        uint24 fee;
        int24 tickLower;
        int24 tickUpper;
        uint256 amount0Desired;
        uint256 amount1Desired;
        uint256 amount0Min;
        uint256 amount1Min;
        address recipient;
        uint256 deadline;
        address from;
        uint160 sqrtPriceX96;
    }

    /// @inheritdoc ActionBase
    function executeAction(
        bytes memory _callData,
        bytes32[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public payable virtual override returns (bytes32) {
        Params memory inputData = parseInputs(_callData);

        inputData.amount0Desired = _parseParamUint(
            inputData.amount0Desired,
            _paramMapping[0],
            _subData,
            _returnValues
        );
        inputData.amount1Desired = _parseParamUint(
            inputData.amount1Desired,
            _paramMapping[1],
            _subData,
            _returnValues
        );

        _createPool(inputData);

        uint256 tokenId = _uniCreatePosition(inputData);

        return bytes32(tokenId);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable override {
        Params memory inputData = parseInputs(_callData);

        _createPool(inputData);
        _uniCreatePosition(inputData);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    function _createPool(Params memory _inputData) internal {
        positionManager.createAndInitializePoolIfNecessary(
            _inputData.token0,
            _inputData.token1,
            _inputData.fee,
            _inputData.sqrtPriceX96
        );
    }

    function _uniCreatePosition(Params memory _inputData) internal returns (uint256 tokenId) {
        // fetch tokens from address;
        uint256 amount0Pulled = _inputData.token0.pullTokensIfNeeded(
            _inputData.from,
            _inputData.amount0Desired
        );
        uint256 amount1Pulled = _inputData.token1.pullTokensIfNeeded(
            _inputData.from,
            _inputData.amount1Desired
        );

        // approve positionManager so it can pull tokens
        _inputData.token0.approveToken(address(positionManager), amount0Pulled);
        _inputData.token1.approveToken(address(positionManager), amount1Pulled);

        _inputData.amount0Desired = amount0Pulled;
        _inputData.amount1Desired = amount1Pulled;

        uint128 liquidity;
        uint256 amount0;
        uint256 amount1;
        (tokenId, liquidity, amount0, amount1) = _uniMint(_inputData);

        //send leftovers
        _inputData.token0.withdrawTokens(_inputData.from, sub(_inputData.amount0Desired, amount0));
        _inputData.token1.withdrawTokens(_inputData.from, sub(_inputData.amount1Desired, amount1));

        logger.Log(
            address(this),
            msg.sender,
            "UniCreatePoolV3",
            abi.encode(_inputData, tokenId, liquidity, amount0, amount1)
        );
    }

    /// @dev mints new NFT that represents a position with selected parameters
    /// @return tokenId of new NFT, how much liquidity it now has and amount of tokens that were transfered to uniswap pool
    function _uniMint(Params memory _inputData)
        internal
        returns (
            uint256 tokenId,
            uint128 liquidity,
            uint256 amount0,
            uint256 amount1
        )
    {
        IUniswapV3NonfungiblePositionManager.MintParams memory mintParams = 
                IUniswapV3NonfungiblePositionManager.MintParams({
                    token0: _inputData.token0,
                    token1: _inputData.token1,
                    fee: _inputData.fee,
                    tickLower: _inputData.tickLower,
                    tickUpper: _inputData.tickUpper,
                    amount0Desired: _inputData.amount0Desired,
                    amount1Desired: _inputData.amount1Desired,
                    amount0Min: _inputData.amount0Min,
                    amount1Min: _inputData.amount1Min,
                    recipient: _inputData.recipient,
                    deadline: _inputData.deadline
                });
        (tokenId, liquidity, amount0, amount1) = positionManager.mint(mintParams);
    }

    function parseInputs(bytes memory _callData) internal pure returns (Params memory inputData) {
        inputData = abi.decode(_callData, (Params));
    }
}
