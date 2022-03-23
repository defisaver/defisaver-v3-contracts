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
        uint256 amount;
        address to;
        uint8 rateMode;
        uint16 assetId;
        bool useOnBehalf;
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
        params.amount = _parseParamUint(params.amount, _paramMapping[1], _subData, _returnValues);
        params.to = _parseParamAddr(params.to, _paramMapping[2], _subData, _returnValues);
        params.onBehalf = _parseParamAddr(params.onBehalf, _paramMapping[3], _subData, _returnValues);

        (uint256 borrowAmount, bytes memory logData) = _borrow(params.market, params.assetId, params.amount, params.rateMode, params.to, params.onBehalf);
        emit ActionEvent("AaveV3Borrow", logData);
        return bytes32(borrowAmount);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable override {
        Params memory params = parseInputs(_callData);
        (, bytes memory logData) = _borrow(params.market, params.assetId, params.amount, params.rateMode, params.to, params.onBehalf);
        //logger.logActionDirectEvent("AaveV3Borrow", logData);
    }

    function executeActionDirectL2() public payable {
        Params memory params = decodeInputs(msg.data[4:]);
        (, bytes memory logData) = _borrow(params.market, params.assetId, params.amount, params.rateMode, params.to, params.onBehalf);
        //logger.logActionDirectEvent("AaveV3Borrow", logData);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    /// @notice User borrows tokens from the Aave protocol
    /// @param _market Address provider for specific market
    /// @param _assetId The id of the token to be deposited
    /// @param _amount Amount of tokens to be borrowed
    /// @param _rateMode Send 1 for stable rate and 2 for variable
    /// @param _to The address we are sending the borrowed tokens to
    /// @param _onBehalf From what user we are borrow the tokens, defaults to proxy
    function _borrow(
        address _market,
        uint16 _assetId,
        uint256 _amount,
        uint256 _rateMode,
        address _to,
        address _onBehalf
    ) internal returns (uint256, bytes memory) {
        IPoolV3 lendingPool = getLendingPool(_market);

        address tokenAddr = lendingPool.getReserveAddressById(_assetId);
        // defaults to onBehalf of proxy
        if (_onBehalf == address(0)) {
            _onBehalf = address(this);
        }
        lendingPool.borrow(tokenAddr, _amount, _rateMode, 0, _onBehalf);
        _amount = tokenAddr.withdrawTokens(_to, _amount);

        bytes memory logData = abi.encode(
            _market,
            tokenAddr,
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

    function encodeInputs(Params memory params) public pure returns (bytes memory encodedInput) {
        encodedInput = bytes.concat(this.executeActionDirectL2.selector);
        encodedInput = bytes.concat(encodedInput, bytes20(params.market));
        encodedInput = bytes.concat(encodedInput, bytes32(params.amount));
        encodedInput = bytes.concat(encodedInput, bytes20(params.to));
        encodedInput = bytes.concat(encodedInput, bytes1(params.rateMode));
        encodedInput = bytes.concat(encodedInput, bytes2(params.assetId));
        encodedInput = bytes.concat(encodedInput, bytes1(boolToBytes(params.useOnBehalf)));
        if (params.useOnBehalf){
            encodedInput = bytes.concat(encodedInput, bytes20(params.onBehalf));
        }
    }

    function decodeInputs(bytes calldata encodedInput) public pure returns (Params memory params) {
        params.market = address(bytes20(encodedInput[0:20]));
        params.amount = uint256(bytes32(encodedInput[20:52]));
        params.to = address(bytes20(encodedInput[52:72]));
        params.rateMode = uint8(bytes1(encodedInput[72:73]));
        params.assetId = uint16(bytes2(encodedInput[73:75]));
        params.useOnBehalf = bytesToBool(bytes1(encodedInput[75:76]));
        params.onBehalf = (params.useOnBehalf ? address(bytes20(encodedInput[76:96])) : address(0));
    }
}
