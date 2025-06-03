// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { IERC4626 } from "../../../interfaces/IERC4626.sol";
import { IERC4626StakeToken } from "../../../interfaces/aaveV3/IERC4626StakeToken.sol";
import { IStaticATokenV2 } from "../../../interfaces/aaveV3/IStaticATokenV2.sol";
import { ActionBase } from "../../ActionBase.sol";
import { AaveV3Helper } from "../helpers/AaveV3Helper.sol";
import { TokenUtils } from "../../../utils/TokenUtils.sol";

/// @title UmbrellaStake - Stake aTokens or GHO tokens using Umbrella Stake Token
/// @notice This action will always pull aTokens for non GHO staking and wrap them into waTokens for staking.
contract UmbrellaStake is ActionBase, AaveV3Helper  {
    using TokenUtils for address;
 
    /// @param stkToken The umbrella stake token.
    /// @param from The address from which the aToken or GHO will be pulled.
    /// @param to The address to which the stkToken will be transferred
    /// @param amount The amount of aToken or GHO to be staked.
    struct Params {
        address stkToken;
        address from;
        address to;
        uint256 amount;
    }

    /// @inheritdoc ActionBase
    function executeAction(
        bytes memory _callData,
        bytes32[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public payable virtual override returns (bytes32) {
        Params memory params = parseInputs(_callData);

        params.stkToken = _parseParamAddr(params.stkToken, _paramMapping[0], _subData, _returnValues);
        params.from = _parseParamAddr(params.from, _paramMapping[1], _subData, _returnValues);
        params.to = _parseParamAddr(params.to, _paramMapping[2], _subData, _returnValues);
        params.amount = _parseParamUint(params.amount, _paramMapping[3], _subData, _returnValues);

        (uint256 stkTokenShares, bytes memory logData) = _stake(params);
        emit ActionEvent("UmbrellaStake", logData);
        return bytes32(stkTokenShares);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable override {
        Params memory params = parseInputs(_callData);
        (, bytes memory logData) = _stake(params);
        logger.logActionDirectEvent("UmbrellaStake", logData);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    /*//////////////////////////////////////////////////////////////
                            ACTION LOGIC
    //////////////////////////////////////////////////////////////*/
    function _stake(Params memory _params) internal returns (uint256, bytes memory) {
        address waTokenOrGHO = IERC4626(_params.stkToken).asset();

        if (waTokenOrGHO == GHO_TOKEN) {
            _params.amount = GHO_TOKEN.pullTokensIfNeeded(_params.from, _params.amount);
            GHO_TOKEN.approveToken(_params.stkToken, _params.amount);
        } else {
            // For non GHO staking, we always pull aTokens and wrap them into waTokens before staking
            address aToken = IStaticATokenV2(waTokenOrGHO).aToken();
            _params.amount = aToken.pullTokensIfNeeded(_params.from, _params.amount);

            // Wrap aTokens to waTokens
            aToken.approveToken(waTokenOrGHO, _params.amount);
            _params.amount = IStaticATokenV2(waTokenOrGHO).depositATokens(
                _params.amount,
                address(this) /* receiver */
            );

            waTokenOrGHO.approveToken(_params.stkToken, _params.amount);
        }

        uint256 shares = IERC4626StakeToken(_params.stkToken).deposit(
            _params.amount,
            _params.to
        );

        return (shares, abi.encode(_params, shares));
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}