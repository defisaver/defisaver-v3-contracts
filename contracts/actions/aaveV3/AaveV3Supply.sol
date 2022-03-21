// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;

import "../../utils/TokenUtils.sol";
import "../ActionBase.sol";
import "./helpers/AaveV3Helper.sol";

/// @title Supply a token to an Aave market
contract AaveV3Supply is ActionBase, AaveV3Helper {
    using TokenUtils for address;

    struct Params {
        address market;
        uint256 amount;
        address from;
        uint16 assetId;
        bool enableAsColl;
        bool useOnBehalf;
        address onBehalf;
    }

    /// @inheritdoc ActionBase
    function executeAction(
        bytes calldata _callData,
        bytes32[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public payable virtual override returns (bytes32) {
        Params memory params = parseInputs(_callData);

        params.market = _parseParamAddr(params.market, _paramMapping[0], _subData, _returnValues);
        params.amount = _parseParamUint(params.amount, _paramMapping[1], _subData, _returnValues);
        params.from = _parseParamAddr(params.from, _paramMapping[2], _subData, _returnValues);
        params.onBehalf = _parseParamAddr(params.onBehalf, _paramMapping[3], _subData, _returnValues);

        (uint256 supplyAmount, bytes memory logData) = _supply(params.market, params.amount, params.from, params.assetId, params.enableAsColl, params.onBehalf);
        emit ActionEvent("AaveV3Supply", logData);
        return bytes32(supplyAmount);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes calldata _callData) public payable override {
        Params memory params = parseInputs(_callData);
        (, bytes memory logData) = _supply(params.market, params.amount, params.from, params.assetId, params.enableAsColl, params.onBehalf);
        //logger.logActionDirectEvent("AaveV3Supply", logData);
    }

    function executeActionDirectL2() public payable {
        Params memory params = decodeInputs(msg.data[4:]);
        (, bytes memory logData) = _supply(params.market, params.amount, params.from, params.assetId, params.enableAsColl, params.onBehalf);
        //logger.logActionDirectEvent("AaveV3Supply", logData);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    /// @notice User deposits tokens to the Aave protocol
    /// @dev User needs to approve the DSProxy to pull the _tokenAddr tokens
    /// @param _market Address provider for specific market
    /// @param _amount Amount of tokens to be deposited
    /// @param _from Where are we pulling the supply tokens amount from
    /// @param _assetId The id of the token to be deposited
    /// @param _enableAsColl If the supply asset should be collateral
    /// @param _onBehalf For what user we are supplying the tokens, defaults to proxy
    function _supply(
        address _market,
        uint256 _amount,
        address _from,
        uint16 _assetId,
        bool _enableAsColl,
        address _onBehalf
    ) internal returns (uint256, bytes memory) {
        IPoolV3 lendingPool = getLendingPool(_market);
        address tokenAddr = lendingPool.getReserveAddressById(_assetId);
        // if amount is set to max, take the whole _from balance
        if (_amount == type(uint256).max) {
            _amount = tokenAddr.getBalance(_from);
        }

        // default to onBehalf of proxy
        if (_onBehalf == address(0)) {
            _onBehalf = address(this);
        }

        // pull tokens to proxy so we can supply
        tokenAddr.pullTokensIfNeeded(_from, _amount);

        // approve aave pool to pull tokens
        tokenAddr.approveToken(address(lendingPool), _amount);
        // deposit in behalf of the proxy
        lendingPool.supply(tokenAddr, _amount, _onBehalf, 0);
        if (_enableAsColl) {
            // enableAsCollateral(_market, _tokenAddr, true);
            lendingPool.setUserUseReserveAsCollateral(tokenAddr, true);
        }
        bytes memory logData = abi.encode(
            _market,
            tokenAddr,
            _amount,
            _from,
            _onBehalf,
            _enableAsColl
        );
        return (_amount, logData);
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
    
    function encodeInputs(Params memory params) public pure returns (bytes memory encodedInput) {
        encodedInput = bytes.concat(encodedInput, bytes20(params.market));

        encodedInput = bytes.concat(encodedInput, bytes2(params.assetId));
        
        encodedInput = bytes.concat(encodedInput, bytes32(params.amount));

        encodedInput = bytes.concat(encodedInput, bytes20(params.from));
        encodedInput = bytes.concat(encodedInput, boolToBytes(params.enableAsColl));
        encodedInput = bytes.concat(encodedInput, boolToBytes(params.useOnBehalf));

        if (params.useOnBehalf) {
            encodedInput = bytes.concat(encodedInput, bytes20(params.onBehalf));
        }
    }

    function decodeInputs(bytes calldata encodedInput) public pure returns (Params memory params) {
        params.market = address(bytes20(encodedInput[0:20]));
        params.assetId = uint16(bytes2(encodedInput[20:22]));
        params.amount = uint256(bytes32(encodedInput[22:54]));
        params.from = address(bytes20(encodedInput[54:74]));
        params.enableAsColl = bytesToBool(bytes1(encodedInput[74:75]));
        params.useOnBehalf = bytesToBool(bytes1(encodedInput[75:76]));
        params.onBehalf = (params.useOnBehalf ? address(bytes20(encodedInput[76:96])) : address(0));
    }
}
