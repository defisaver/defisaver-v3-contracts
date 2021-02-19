// SPDX-License-Identifier: MIT

pragma solidity ^0.7.0;
pragma experimental ABIEncoderV2;

import "../../interfaces/aave/ILendToAaveMigrator.sol";
import "../../utils/GasBurner.sol";
import "../../utils/TokenUtils.sol";
import "../ActionBase.sol";
import "./helpers/AaveHelper.sol";

/// @title Migrates Lend token to Aave token
contract AaveMigrateLend is ActionBase, AaveHelper, GasBurner {

    using TokenUtils for address;

    address public constant LEND_MIGRATOR_ADDR = 0x317625234562B1526Ea2FaC4030Ea499C5291de4;
    address public constant LEND_ADDR = 0x80fB784B7eD66730e8b1DBd9820aFD29931aab03;
    address public constant AAVE_ADDR = 0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9;

    /// @inheritdoc ActionBase
    function executeAction(
        bytes[] memory _callData,
        bytes[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public virtual override payable returns (bytes32) {
        (uint256 lendAmount, address from, address to) = parseInputs(_callData);

        lendAmount = _parseParamUint(lendAmount, _paramMapping[0], _subData, _returnValues);
        from = _parseParamAddr(from, _paramMapping[1], _subData, _returnValues);
        to = _parseParamAddr(to, _paramMapping[2], _subData, _returnValues);

        uint256 aaveAmount = _migrate(lendAmount, from, to);

        return bytes32(aaveAmount);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes[] memory _callData) public override payable burnGas {
        (uint256 lendAmount, address from, address to) = parseInputs(_callData);

        _migrate(lendAmount, from, to);
    }

    /// @inheritdoc ActionBase
    function actionType() public virtual override pure returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////


    /// @notice Migrates Lend token to Aave token
    /// @dev User needs to approve the DSProxy to pull the lend tokens
    /// @param _lendAmount Amount of lend tokens to migrate
    /// @param _from Where we are pulling the lend tokens from
    /// @param _to Where are we sending the aave tokens to
    function _migrate(
        uint _lendAmount,
        address _from,
        address _to
    ) internal returns (uint) {

        // pull tokens to proxy so we can supply
        _lendAmount = LEND_ADDR.pullTokens(_from, _lendAmount);

        LEND_ADDR.approveToken(LEND_MIGRATOR_ADDR, _lendAmount);

        uint aaveBalanceBefore = AAVE_ADDR.getBalance(address(this));

        // migrate
        ILendToAaveMigrator(LEND_MIGRATOR_ADDR).migrateFromLEND(_lendAmount);

        uint aaveBalanceAfter = AAVE_ADDR.getBalance(address(this));
        uint aaveMigrated = (aaveBalanceAfter - aaveBalanceBefore);

        // withdraw
        AAVE_ADDR.withdrawTokens(_to, aaveMigrated);
       
        return aaveMigrated;
    }

    function parseInputs(bytes[] memory _callData)
        internal
        pure
        returns (
            uint256 lendAmount,
            address from,
            address to
        )
    {
        lendAmount = abi.decode(_callData[0], (uint256));
        from = abi.decode(_callData[1], (address));
        to = abi.decode(_callData[2], (address));
    }
}
