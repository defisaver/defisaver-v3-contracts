// SPDX-License-Identifier: MIT
pragma solidity =0.8.10;

import "../../utils/TokenUtils.sol";
import "../ActionBase.sol";
import "./helpers/AaveV3Helper.sol";

/// @title Borrow a token from AaveV3 market
contract AaveV3Borrow is ActionBase, AaveV3Helper {
    using TokenUtils for address;

    struct Params {
        uint256 amount;
        address to;
        uint8 rateMode;
        uint16 assetId;
        bool useDefaultMarket;
        bool useOnBehalf;
        address market;
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

        params.amount = _parseParamUint(params.amount, _paramMapping[0], _subData, _returnValues);
        params.to = _parseParamAddr(params.to, _paramMapping[1], _subData, _returnValues);
        params.rateMode = uint8(_parseParamUint(uint8(params.rateMode), _paramMapping[2], _subData, _returnValues));
        params.assetId = uint16(_parseParamUint(uint16(params.assetId), _paramMapping[3], _subData, _returnValues));
        params.useDefaultMarket = _parseParamUint(params.useDefaultMarket ? 1 : 0, _paramMapping[4], _subData, _returnValues) == 1;
        params.useOnBehalf = _parseParamUint(params.useOnBehalf ? 1 : 0, _paramMapping[5], _subData, _returnValues) == 1;
        params.market = _parseParamAddr(params.market, _paramMapping[6], _subData, _returnValues);
        params.onBehalf = _parseParamAddr(
            params.onBehalf,
            _paramMapping[7],
            _subData,
            _returnValues
        );

        if (params.useDefaultMarket) {
            params.market = DEFAULT_AAVE_MARKET;
        }
        if (!params.useOnBehalf) {
            params.onBehalf = address(0);
        }

        (uint256 borrowAmount, bytes memory logData) = _borrow(
            params.market,
            params.assetId,
            params.amount,
            params.rateMode,
            params.to,
            params.onBehalf
        );
        emit ActionEvent("AaveV3Borrow", logData);
        return bytes32(borrowAmount);
    }

    /// @inheritdoc ActionBase
    /// @dev Only used on L2 currently, must parse inputs here if implemented later on
    function executeActionDirect(bytes memory _callData) public payable override {}

    function executeActionDirectL2() public payable {
        Params memory params = decodeInputs(msg.data[4:]);
        (, bytes memory logData) = _borrow(
            params.market,
            params.assetId,
            params.amount,
            params.rateMode,
            params.to,
            params.onBehalf
        );
        logger.logActionDirectEvent("AaveV3Borrow", logData);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    /// @notice User borrows tokens from the Aave protocol
    /// @param _market Address provider for specific market
    /// @param _assetId The id of the token to be borrowed
    /// @param _amount Amount of tokens to be borrowed
    /// @param _rateMode Type of borrow debt [Stable: 1, Variable: 2]
    /// @param _to The address we are sending the borrowed tokens to
    /// @param _onBehalf On whose behalf we borrow the tokens, defaults to proxy
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
        lendingPool.borrow(tokenAddr, _amount, _rateMode, AAVE_REFERRAL_CODE, _onBehalf);
        _amount = tokenAddr.withdrawTokens(_to, _amount);

        bytes memory logData = abi.encode(_market, tokenAddr, _amount, _rateMode, _to, _onBehalf);
        return (_amount, logData);
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }

    function encodeInputs(Params memory params) public pure returns (bytes memory encodedInput) {
        encodedInput = bytes.concat(this.executeActionDirectL2.selector);
        encodedInput = bytes.concat(encodedInput, bytes32(params.amount));
        encodedInput = bytes.concat(encodedInput, bytes20(params.to));
        encodedInput = bytes.concat(encodedInput, bytes1(params.rateMode));
        encodedInput = bytes.concat(encodedInput, bytes2(params.assetId));
        encodedInput = bytes.concat(encodedInput, boolToBytes(params.useDefaultMarket));
        encodedInput = bytes.concat(encodedInput, boolToBytes(params.useOnBehalf));
        if (!params.useDefaultMarket) {
            encodedInput = bytes.concat(encodedInput, bytes20(params.market));
        }
        if (params.useOnBehalf) {
            encodedInput = bytes.concat(encodedInput, bytes20(params.onBehalf));
        }
    }

    function decodeInputs(bytes calldata encodedInput) public pure returns (Params memory params) {
        params.amount = uint256(bytes32(encodedInput[0:32]));
        params.to = address(bytes20(encodedInput[32:52]));
        params.rateMode = uint8(bytes1(encodedInput[52:53]));
        params.assetId = uint16(bytes2(encodedInput[53:55]));
        params.useDefaultMarket = bytesToBool(bytes1(encodedInput[55:56]));
        params.useOnBehalf = bytesToBool(bytes1(encodedInput[56:57]));
        uint256 mark = 57;

        if (params.useDefaultMarket) {
            params.market = DEFAULT_AAVE_MARKET;
        } else {
            params.market = address(bytes20(encodedInput[mark:mark + 20]));
            mark += 20;
        }

        if (params.useOnBehalf) {
            params.onBehalf = address(bytes20(encodedInput[mark:mark + 20]));
        } else {
            params.onBehalf = address(0);
        }
    }
}
