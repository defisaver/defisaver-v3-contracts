// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;

import "../../interfaces/IWETH.sol";
import "../../utils/TokenUtils.sol";
import "../ActionBase.sol";
import "./helpers/AaveV3Helper.sol";
import "../../interfaces/aave/IAToken.sol";

/// @title Payback a token a user borrowed from an Aave market
contract AaveV3ATokenPayback is ActionBase, AaveV3Helper {
    using TokenUtils for address;

    struct Params {
        address market;
        uint256 amount;
        address from;
        uint8 rateMode;
        uint16 assetId;
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
        params.amount = _parseParamUint(params.amount, _paramMapping[0], _subData, _returnValues);
        params.from = _parseParamAddr(params.from, _paramMapping[1], _subData, _returnValues);

        (uint256 paybackAmount, bytes memory logData) = _paybackWithATokens(
            params.market,
            params.assetId,
            params.amount,
            params.rateMode,  
            params.from      
        );
        emit ActionEvent("AaveV3ATokenPayback", logData);
        return bytes32(paybackAmount);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable override {
        Params memory params = parseInputs(_callData);
        (, bytes memory logData) = _paybackWithATokens(
            params.market,
            params.assetId,
            params.amount,
            params.rateMode,  
            params.from      
        );
        //logger.logActionDirectEvent("AaveV3ATokenPayback", logData);
    }

    function executeActionDirectL2() public payable {
        Params memory params = decodeInputs(msg.data[4:]);
        (, bytes memory logData) = _paybackWithATokens(
            params.market,
            params.assetId,
            params.amount,
            params.rateMode,  
            params.from      
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
    function _paybackWithATokens(
        address _market,
        uint16 _assetId,
        uint256 _amount,
        uint256 _rateMode,
        address _from
    ) internal returns (uint256, bytes memory) {
        IPoolV3 lendingPool = getLendingPool(_market);

        address tokenAddr = lendingPool.getReserveAddressById(_assetId);

        uint256 maxDebt = getWholeDebt(_market, tokenAddr, _rateMode, address(this));
        _amount = _amount > maxDebt ? maxDebt : _amount;
        
        DataTypes.ReserveData memory reserveData = lendingPool.getReserveData(tokenAddr);
        address aTokenAddr = reserveData.aTokenAddress;

        aTokenAddr.pullTokensIfNeeded(_from, _amount);
        //aTokenAddr.approveToken(address(lendingPool), _amount);

        uint256 tokensBefore = aTokenAddr.getBalance(address(this));

        lendingPool.repayWithATokens(tokenAddr, _amount, _rateMode);

        uint256 tokensAfter = aTokenAddr.getBalance(address(this));

        // send back any leftover tokens that weren't used in the repay
        aTokenAddr.withdrawTokens(_from, tokensAfter);

        bytes memory logData = abi.encode(
            _market,
            tokenAddr,
            _amount,
            _rateMode,
            _from
        );
        return (tokensBefore - tokensAfter, logData);
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }

    function encodeInputs(Params memory params) public pure returns (bytes memory encodedInput) {
    }
    function decodeInputs(bytes calldata encodedInput) public pure returns (Params memory params) {
    }
}