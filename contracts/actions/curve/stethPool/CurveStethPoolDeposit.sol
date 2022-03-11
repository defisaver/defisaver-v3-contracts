// SPDX-License-Identifier: MIT

pragma solidity =0.7.6;
pragma experimental ABIEncoderV2;

import "../../../interfaces/curve/stethPool/ICurveStethPool.sol";
import "../helpers/CurveHelper.sol";
import "../../../utils/TokenUtils.sol";
import "../../../utils/SafeMath.sol";
import "../../ActionBase.sol";

contract CurveStethPoolDeposit is ActionBase {
    using TokenUtils for address;
    using SafeMath for uint256;

    address constant internal CURVE_STETH_POOL_ADDR = 0xDC24316b9AE028F1497c275EB9192a3Ea0f67022;
    address constant STE_CRV_ADDR = 0x06325440D014e39736583c165C2963BA99fAf14E;
    address constant STETH_ADDR = 0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84;

    struct Params {
        address from;         // address where to pull tokens from
        address to;       // address that will receive the LP tokens
        uint256[2] amounts;     // amount of each token to deposit
        uint256 minMintAmount;  // minimum amount of LP tokens to accept
    }

    function executeAction(
        bytes[] memory _callData,
        bytes[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public payable virtual override returns (bytes32) {
        Params memory params = parseInputs(_callData);
        params.from = _parseParamAddr(params.from, _paramMapping[0], _subData, _returnValues);
        params.to = _parseParamAddr(params.to, _paramMapping[1], _subData, _returnValues);
        params.amounts[0] = _parseParamUint(params.amounts[0], _paramMapping[2], _subData, _returnValues);
        params.amounts[1] = _parseParamUint(params.amounts[1], _paramMapping[3], _subData, _returnValues);
        params.minMintAmount = _parseParamUint(params.minMintAmount, _paramMapping[4], _subData, _returnValues);

        uint256 receivedLp = _curveDeposit(params);
        return bytes32(receivedLp);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes[] memory _callData) public payable virtual override {
        Params memory params = parseInputs(_callData);
        _curveDeposit(params);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    /// @notice Deposits tokens into curve steth pool
    function _curveDeposit(Params memory _params) internal returns (uint256 receivedLp) {
        require(_params.to != address(0), "to cant be 0x0");

        TokenUtils.WETH_ADDR.pullTokensIfNeeded(_params.from, _params.amounts[0]);
        TokenUtils.withdrawWeth(_params.amounts[0]);

        STETH_ADDR.pullTokensIfNeeded(_params.from, _params.amounts[1]);
        STETH_ADDR.approveToken(CURVE_STETH_POOL_ADDR, _params.amounts[1]);

        receivedLp = ICurveStethPool(CURVE_STETH_POOL_ADDR).add_liquidity{
            value: _params.amounts[0]
        }(_params.amounts, _params.minMintAmount);

        STE_CRV_ADDR.withdrawTokens(_params.to, receivedLp);

        logger.Log(
            address(this),
            msg.sender,
            "CurveStethPoolDeposit",
            abi.encode(receivedLp)
        );
    }

    function parseInputs(bytes[] memory _callData) internal pure returns (Params memory params) {
        params = abi.decode(_callData[0], (Params));
    }
}