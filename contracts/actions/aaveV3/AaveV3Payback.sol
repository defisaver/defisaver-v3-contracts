// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;

import "../../interfaces/IWETH.sol";
import "../../utils/TokenUtils.sol";
import "../ActionBase.sol";
import "./helpers/AaveV3Helper.sol";

/// @title Payback a token a user borrowed from an Aave market
contract AaveV3Payback is ActionBase, AaveV3Helper {
    using TokenUtils for address;
    struct Params {
        address market;
        uint256 amount;
        address from;
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
        params.from = _parseParamAddr(params.from, _paramMapping[2], _subData, _returnValues);
        params.onBehalf = _parseParamAddr(params.onBehalf, _paramMapping[3], _subData, _returnValues);

        (uint256 paybackAmount, bytes memory logData) = _payback(
            params.market,
            params.assetId,
            params.amount,
            params.rateMode,
            params.from,
            params.onBehalf
        );
        emit ActionEvent("AaveV3Payback", logData);
        return bytes32(paybackAmount);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable override {
        Params memory params = parseInputs(_callData);
        (, bytes memory logData) = _payback(
            params.market,
            params.assetId,
            params.amount,
            params.rateMode,
            params.from,
            params.onBehalf
        );
        // logger.logActionDirectEvent("AaveV3Payback", logData);
    }

    function executeActionDirectL2() public payable {
        Params memory params = decodeInputs(msg.data[4:]);
        (, bytes memory logData) = _payback(
            params.market,
            params.assetId,
            params.amount,
            params.rateMode,
            params.from,
            params.onBehalf
        );        
        //logger.logActionDirectEvent("AaveV3Payback", logData);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    /// @notice User paybacks tokens to the Aave protocol
    /// @dev User needs to approve the DSProxy to pull the _tokenAddr tokens
    /// @param _market Address provider for specific market
    /// @param _assetId The id of the token to be deposited
    /// @param _amount Amount of tokens to be payed back
    /// @param _rateMode Type of borrow debt [Stable: 1, Variable: 2]
    /// @param _from Where are we pulling the payback tokens amount from
    /// @param _onBehalf For what user we are paying back the debt, defaults to proxy
    function _payback(
        address _market,
        uint16 _assetId,
        uint256 _amount,
        uint256 _rateMode,
        address _from,
        address _onBehalf
    ) internal returns (uint256, bytes memory) {
        // default to onBehalf of proxy
        if (_onBehalf == address(0)) {
            _onBehalf = address(this);
        }
        IPoolV3 lendingPool = getLendingPool(_market);
        address tokenAddr = lendingPool.getReserveAddressById(_assetId);

        uint256 maxDebt = getWholeDebt(_market, tokenAddr, _rateMode, _onBehalf);
        _amount = _amount > maxDebt ? maxDebt : _amount;

        tokenAddr.pullTokensIfNeeded(_from, _amount);
        tokenAddr.approveToken(address(lendingPool), _amount);

        uint256 tokensBefore = tokenAddr.getBalance(address(this));

        lendingPool.repay(tokenAddr, _amount, _rateMode, _onBehalf);

        uint256 tokensAfter = tokenAddr.getBalance(address(this));

        // send back any leftover tokens that weren't used in the repay
        tokenAddr.withdrawTokens(_from, tokensAfter);

        bytes memory logData = abi.encode(
            _market,
            tokenAddr,
            _amount,
            _rateMode,
            _from,
            _onBehalf
        );
        return (tokensBefore - tokensAfter, logData);
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }

    function encodeInputs(Params memory params) public pure returns (bytes memory encodedInput) {
        encodedInput = bytes.concat(this.executeActionDirectL2.selector);
        encodedInput = bytes.concat(encodedInput, bytes20(params.market));
        encodedInput = bytes.concat(encodedInput, bytes32(params.amount));
        encodedInput = bytes.concat(encodedInput, bytes20(params.from));
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
        params.from = address(bytes20(encodedInput[52:72]));
        params.rateMode = uint8(bytes1(encodedInput[72:73]));
        params.assetId = uint16(bytes2(encodedInput[73:75]));
        params.useOnBehalf = bytesToBool(bytes1(encodedInput[75:76]));
        params.onBehalf = (params.useOnBehalf ? address(bytes20(encodedInput[76:96])) : address(0));
    }
}
