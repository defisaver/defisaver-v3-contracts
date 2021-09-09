// SPDX-License-Identifier: MIT
pragma solidity =0.7.6;
pragma experimental ABIEncoderV2;

import "../../ActionBase.sol";
import "../helpers/CurveHelper.sol";
import "../../../utils/TokenUtils.sol";
import "../../../utils/SafeMath.sol";

contract CurveMintCrv is ActionBase, CurveHelper {
    using TokenUtils for address;
    using SafeMath for uint256;
    
    struct Params {
        address gaugeAddr;  // gauge determening Crv issuance
        address receiver;   // address that will receive the Crv issuance
    }

    function executeAction(
        bytes[] memory _callData,
        bytes[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public payable virtual override returns (bytes32) {
        Params memory params = parseInputs(_callData);
        params.receiver = _parseParamAddr(params.receiver, _paramMapping[0], _subData, _returnValues);
        
        uint256 minted = _curveMintCrv(params);
        return bytes32(minted);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes[] memory _callData) public payable virtual override {
        Params memory params = parseInputs(_callData);
        _curveMintCrv(params);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    /// @notice Mints Crv tokens based on one Liquidity Gauge
    function _curveMintCrv(Params memory _params) internal returns (uint256) {
        require(_params.receiver != address(0), "receiver cant be 0x0");

        uint256 balanceBefore = CRV_TOKEN_ADDR.getBalance(address(this));
        Minter.mint(_params.gaugeAddr);
        uint256 minted = CRV_TOKEN_ADDR.getBalance(address(this)).sub(balanceBefore);

        CRV_TOKEN_ADDR.withdrawTokens(_params.receiver, minted);

        logger.Log(
            address(this),
            msg.sender,
            "CurveMintCrv",
            abi.encode(
                _params,
                minted
                )
        );

        return minted;
    }

    function parseInputs(bytes[] memory _callData) internal pure returns (Params memory params) {
        params = abi.decode(_callData[0], (Params));
    }
}