// SPDX-License-Identifier: MIT
pragma solidity =0.8.10;

import "../../utils/TokenUtils.sol";
import "../ActionBase.sol";
import "./helpers/AaveV3Helper.sol";
/// @title Borrow a token a from an Aave market
contract AaveV3Borrow is ActionBase, AaveV3Helper {
    using TokenUtils for address;

    struct Params {
        address market;
        address tokenAddr;
        uint256 amount;
        uint256 rateMode;
        address to;
        address onBehalf;
    }

    /// @inheritdoc ActionBase
    function executeAction(
        bytes memory _callData,
        bytes32[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public payable virtual override returns (bytes32) {
        Params memory params = parseInputs(_callData);

        params.market = _parseParamAddr(params.market, _paramMapping[0], _subData, _returnValues);
        params.tokenAddr = _parseParamAddr(params.tokenAddr, _paramMapping[1], _subData, _returnValues);
        params.amount = _parseParamUint(params.amount, _paramMapping[2], _subData, _returnValues);
        params.rateMode = _parseParamUint(params.rateMode, _paramMapping[3], _subData, _returnValues);
        params.to = _parseParamAddr(params.to, _paramMapping[4], _subData, _returnValues);
        params.onBehalf = _parseParamAddr(params.onBehalf, _paramMapping[5], _subData, _returnValues);

        (uint256 borrowAmount, bytes memory logData) = _borrow(params.market, params.tokenAddr, params.amount, params.rateMode, params.to, params.onBehalf);
        emit ActionEvent("AaveV3Borrow", logData);
        return bytes32(borrowAmount);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable override {
        Params memory params = parseInputs(_callData);
        (, bytes memory logData) = _borrow(params.market, params.tokenAddr, params.amount, params.rateMode, params.to, params.onBehalf);
        logger.logActionDirectEvent("AaveV3Borrow", logData);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    /// @notice User borrows tokens from the Aave protocol
    /// @param _market Address provider for specific market
    /// @param _tokenAddr The address of the token to be borrowed
    /// @param _amount Amount of tokens to be borrowed
    /// @param _rateMode Send 1 for stable rate and 2 for variable
    /// @param _to The address we are sending the borrowed tokens to
    /// @param _onBehalf From what user we are borrow the tokens, defaults to proxy
    function _borrow(
        address _market,
        address _tokenAddr,
        uint256 _amount,
        uint256 _rateMode,
        address _to,
        address _onBehalf
    ) internal returns (uint256, bytes memory) {
        IPoolV3 lendingPool = getLendingPool(_market);
        // defaults to onBehalf of proxy
        if (_onBehalf == address(0)) {
            _onBehalf = address(this);
        }

        lendingPool.borrow(_tokenAddr, _amount, _rateMode, AAVE_REFERRAL_CODE, _onBehalf);

        _amount = _tokenAddr.withdrawTokens(_to, _amount);

        bytes memory logData = abi.encode(
            _market,
            _tokenAddr,
            _amount,
            _rateMode,
            _to,
            _onBehalf
        );
        return (_amount, logData);
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}
