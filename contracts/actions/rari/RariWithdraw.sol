// SPDX-License-Identifier: MIT

pragma solidity =0.7.6;
pragma experimental ABIEncoderV2;

import "../ActionBase.sol";
import "../../utils/TokenUtils.sol";
import "../../DS/DSMath.sol";
import "../../interfaces/IERC20.sol";
import "../../interfaces/rari/IFundManager.sol";

/// @title Burns rari pool tokens and withdraws stablecoin from pool
contract RariWithdraw is ActionBase, DSMath {
    using TokenUtils for address;

    struct Params {
        address fundManager;
        address poolTokenAddress;
        uint256 poolTokensAmountToPull;
        address from;
        address stablecoinAddress;
        uint256 stablecoinAmountToWithdraw;
        address to;
    }

    /// @inheritdoc ActionBase
    function executeAction(
        bytes[] memory _callData,
        bytes[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public payable virtual override returns (bytes32) {
        Params memory inputData = parseInputs(_callData);

        inputData.poolTokensAmountToPull = _parseParamUint(
            inputData.poolTokensAmountToPull,
            _paramMapping[0],
            _subData,
            _returnValues
        );
        inputData.from = _parseParamAddr(inputData.from, _paramMapping[1], _subData, _returnValues);

        inputData.stablecoinAmountToWithdraw = _parseParamUint(
            inputData.stablecoinAmountToWithdraw,
            _paramMapping[2],
            _subData,
            _returnValues
        );
        inputData.to = _parseParamAddr(inputData.to, _paramMapping[3], _subData, _returnValues);

        uint256 tokensWithdrawn = _rariWithdraw(inputData);
        return bytes32(tokensWithdrawn);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes[] memory _callData) public payable override {
        Params memory inputData = parseInputs(_callData);

        _rariWithdraw(inputData);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////
    function _rariWithdraw(Params memory _inputData) internal returns (uint256 tokensWithdrawn) {
        require(_inputData.to != address(0), "Can't send to burn address");

        IFundManager fundManager = IFundManager(_inputData.fundManager);

        // pull tokens if they're not on proxy
        _inputData.poolTokensAmountToPull = _inputData.poolTokenAddress.pullTokensIfNeeded(
            _inputData.from,
            _inputData.poolTokensAmountToPull
        );

        uint256 poolTokensBeforeWithdraw = _inputData.poolTokenAddress.getBalance(address(this));
        tokensWithdrawn = fundManager.withdraw(
            IERC20(_inputData.stablecoinAddress).symbol(),
            _inputData.stablecoinAmountToWithdraw
        );
        uint256 poolTokensAfterWithdraw = _inputData.poolTokenAddress.getBalance(address(this));

        uint256 poolTokensBurnt = sub(poolTokensBeforeWithdraw, poolTokensAfterWithdraw);
        _inputData.poolTokenAddress.withdrawTokens(
            _inputData.from,
            sub(_inputData.poolTokensAmountToPull, poolTokensBurnt)
        );

        _inputData.stablecoinAddress.withdrawTokens(_inputData.to, tokensWithdrawn);

        logger.Log(
            address(this),
            msg.sender,
            "RariWithdraw",
            abi.encode(_inputData, tokensWithdrawn)
        );
    }

    function parseInputs(bytes[] memory _callData) internal pure returns (Params memory inputData) {
        inputData = abi.decode(_callData[0], (Params));
    }
}
