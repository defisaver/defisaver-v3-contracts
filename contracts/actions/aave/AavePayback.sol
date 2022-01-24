// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;

import "../../interfaces/IWETH.sol";
import "../../utils/TokenUtils.sol";
import "../ActionBase.sol";
import "./helpers/AaveHelper.sol";

/// @title Payback a token a user borrowed from an Aave market
contract AavePayback is ActionBase, AaveHelper {
    using TokenUtils for address;
    struct Params {
        address market;
        address tokenAddr;
        uint256 amount;
        uint256 rateMode;
        address from;
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
        params.from = _parseParamAddr(params.from, _paramMapping[4], _subData, _returnValues);
        params.onBehalf = _parseParamAddr(params.onBehalf, _paramMapping[5], _subData, _returnValues);

        (uint256 paybackAmount, bytes memory logData) = _payback(params.market, params.tokenAddr, params.amount, params.rateMode, params.from, params.onBehalf);
        emit ActionEvent("AavePayback", logData);
        return bytes32(paybackAmount);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable override {
        Params memory params = parseInputs(_callData);
        (, bytes memory logData) = _payback(params.market, params.tokenAddr, params.amount, params.rateMode, params.from, params.onBehalf);
        logger.logActionDirectEvent("AavePayback", logData);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    /// @notice User paybacks tokens to the Aave protocol
    /// @dev User needs to approve the DSProxy to pull the _tokenAddr tokens
    /// @param _market Address provider for specific market
    /// @param _tokenAddr The address of the token to be payed back
    /// @param _amount Amount of tokens to be payed back
    /// @param _rateMode Type of borrow debt [Stable: 1, Variable: 2]
    /// @param _from Where are we pulling the payback tokens amount from
    /// @param _onBehalf For what user we are paying back the debt, defaults to proxy
    function _payback(
        address _market,
        address _tokenAddr,
        uint256 _amount,
        uint256 _rateMode,
        address _from,
        address _onBehalf
    ) internal returns (uint256, bytes memory) {
        // default to onBehalf of proxy
        if (_onBehalf == address(0)) {
            _onBehalf = address(this);
        }
        ILendingPoolV2 lendingPool = getLendingPool(_market);
        uint256 maxDebt = getWholeDebt(_market, _tokenAddr, _rateMode, _onBehalf);
        _amount = _amount > maxDebt ? maxDebt : _amount;

        _tokenAddr.pullTokensIfNeeded(_from, _amount);
        _tokenAddr.approveToken(address(lendingPool), _amount);

        uint256 tokensBefore = _tokenAddr.getBalance(address(this));

        lendingPool.repay(_tokenAddr, _amount, _rateMode, _onBehalf);

        uint256 tokensAfter = _tokenAddr.getBalance(address(this));

        // send back any leftover tokens that weren't used in the repay
        _tokenAddr.withdrawTokens(_from, tokensAfter);

        bytes memory logData = abi.encode(
            _market,
            _tokenAddr,
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

    function getWholeDebt(address _market, address _tokenAddr, uint _borrowType, address _debtOwner) internal view returns (uint256) {
        IAaveProtocolDataProviderV2 dataProvider = getDataProvider(_market);
        (, uint256 borrowsStable, uint256 borrowsVariable, , , , , , ) =
            dataProvider.getUserReserveData(_tokenAddr, _debtOwner);

        if (_borrowType == STABLE_ID) {
            return borrowsStable;
        } else if (_borrowType == VARIABLE_ID) {
            return borrowsVariable;
        }
    }
}
