// SPDX-License-Identifier: MIT

pragma solidity =0.8.4;

import "../../../interfaces/uniswap/IUniswapV2Factory.sol";
import "../../../interfaces/exchange/IUniswapRouter.sol";
import "../../../utils/TokenUtils.sol";
import "../../ActionBase.sol";
import "./helpers/UniV2Helper.sol";

/// @title Supplies liquidity to uniswap
contract UniWithdraw is ActionBase, UniV2Helper {
    using TokenUtils for address;

    struct UniWithdrawData {
        address tokenA;
        address tokenB;
        uint256 liquidity;
        address to;
        address from;
        uint256 amountAMin;
        uint256 amountBMin;
        uint256 deadline;
    }

    /// @inheritdoc ActionBase
    function executeAction(
        bytes memory _callData,
        bytes32[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public payable virtual override returns (bytes32) {
        UniWithdrawData memory uniData = parseInputs(_callData);

        uniData.tokenA = _parseParamAddr(uniData.tokenA, _paramMapping[0], _subData, _returnValues);
        uniData.tokenB = _parseParamAddr(uniData.tokenB, _paramMapping[1], _subData, _returnValues);
        uniData.liquidity = _parseParamUint(
            uniData.liquidity,
            _paramMapping[2],
            _subData,
            _returnValues
        );
        uniData.to = _parseParamAddr(uniData.to, _paramMapping[3], _subData, _returnValues);
        uniData.from = _parseParamAddr(uniData.from, _paramMapping[4], _subData, _returnValues);

        uint256 liqAmount = _uniWithdraw(uniData);

        return bytes32(liqAmount);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable override {
        UniWithdrawData memory uniData = parseInputs(_callData);

        _uniWithdraw(uniData);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    /// @notice Removes liquidity from uniswap
    /// @param _uniData All the required data to withdraw from uni
    function _uniWithdraw(UniWithdrawData memory _uniData) internal returns (uint256) {
        address lpTokenAddr = factory.getPair(_uniData.tokenA, _uniData.tokenB);

        uint pulledTokens = lpTokenAddr.pullTokensIfNeeded(_uniData.from, _uniData.liquidity);
        lpTokenAddr.approveToken(address(router), pulledTokens);

        _uniData.liquidity = pulledTokens;

        // withdraw liq. and get info how much we got out
        (uint256 amountA, uint256 amountB) = _withdrawLiquidity(_uniData);

        logger.Log(
            address(this),
            msg.sender,
            "UniWithdraw",
            abi.encode(_uniData, amountA, amountB)
        );

        return _uniData.liquidity;
    }

    function _withdrawLiquidity(UniWithdrawData memory _uniData)
        internal
        returns (uint256 amountA, uint256 amountB)
    {
        (amountA, amountB) = router.removeLiquidity(
            _uniData.tokenA,
            _uniData.tokenB,
            _uniData.liquidity,
            _uniData.amountAMin,
            _uniData.amountBMin,
            _uniData.to,
            _uniData.deadline
        );
    }

    function parseInputs(bytes memory _callData)
       public
        pure
        returns (UniWithdrawData memory uniData)
    {
        uniData = abi.decode(_callData, (UniWithdrawData));
    }
}
