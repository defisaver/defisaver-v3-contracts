// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { ICoinJoin } from "../../interfaces/reflexer/ICoinJoin.sol";
import { TokenUtils } from "../../utils/TokenUtils.sol";
import { ActionBase } from "../ActionBase.sol";
import { ReflexerHelper } from "./helpers/ReflexerHelper.sol";
import { ISAFEEngine } from "../../interfaces/reflexer/ISAFEEngine.sol";

/// @title Payback rai debt for a reflexer safe
contract ReflexerPayback is ActionBase, ReflexerHelper {
    using TokenUtils for address;

    /// @param safeId Id of the safe
    /// @param amount Amount of rai to be paid back
    /// @param from Address which will send the rai
    struct Params {
        uint256 safeId;
        uint256 amount;
        address from;
    }
    error InvalidCollateralType();

    /// @inheritdoc ActionBase
    function executeAction(
        bytes memory _callData,
        bytes32[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public payable override returns (bytes32) {
        Params memory inputData = parseInputs(_callData);

        inputData.safeId = _parseParamUint(inputData.safeId, _paramMapping[0], _subData, _returnValues);
        inputData.amount = _parseParamUint(inputData.amount, _paramMapping[1], _subData, _returnValues);
        inputData.from = _parseParamAddr(inputData.from, _paramMapping[2], _subData, _returnValues);

        (uint256 repayAmount, bytes memory logData) = _reflexerPayback(inputData.safeId, inputData.amount, inputData.from);
        emit ActionEvent("ReflexerPayback", logData);
        return bytes32(repayAmount);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable override {
        Params memory inputData = parseInputs(_callData);
        (, bytes memory logData) = _reflexerPayback(inputData.safeId, inputData.amount, inputData.from);
        logger.logActionDirectEvent("ReflexerPayback", logData);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    /// @param _safeId Id of the safe
    /// @param _amount Amount of rai to be paid back
    /// @param _from Where the rai is pulled from
    function _reflexerPayback(
        uint256 _safeId,
        uint256 _amount,
        address _from
    ) internal returns (uint256, bytes memory) {
        address safe = safeManager.safes(_safeId);
        bytes32 collType = safeManager.collateralTypes(_safeId);

        // if _amount is higher than current debt, repay all debt
        uint256 debt = getAllDebt(safe, safe, collType);
        _amount = _amount > debt ? debt : _amount;

        // pull rai from user and join the reflexer pool
        RAI_ADDRESS.pullTokensIfNeeded(_from, _amount);
        RAI_ADDRESS.approveToken(RAI_ADAPTER_ADDRESS, _amount);
        ICoinJoin(RAI_ADAPTER_ADDRESS).join(safe, _amount);

        int256 paybackAmount =
            _getRepaidDeltaDebt(ISAFEEngine(safeEngine).coinBalance(safe), safe, collType);

        // decrease the safe debt
        safeManager.modifySAFECollateralization(_safeId, 0, paybackAmount);

        bytes memory logData = abi.encode(_safeId, _amount, _from);
        return (_amount, logData);
    }

    /// @dev Gets repaid delta debt generated (rate adjusted debt)
    /// @param coin uint amount
    /// @param safe uint - safeId
    /// @param collateralType bytes32
    /// @return deltaDebt
    function _getRepaidDeltaDebt(
        uint256 coin,
        address safe,
        bytes32 collateralType
    ) internal view returns (int256 deltaDebt) {
        // Gets actual rate from the safeEngine
        (, uint256 rate, , , , ) = safeEngine.collateralTypes(collateralType);
        if (rate <= 0){
            revert InvalidCollateralType();
        }

        // Gets actual generatedDebt value of the safe
        (, uint256 generatedDebt) = safeEngine.safes(collateralType, safe);

        // Uses the whole coin balance in the safeEngine to reduce the debt
        deltaDebt = toPositiveInt(coin / rate);
        // Checks the calculated deltaDebt is not higher than safe.generatedDebt (total debt), otherwise uses its value
        deltaDebt = uint256(deltaDebt) <= generatedDebt
            ? -deltaDebt
            : -toPositiveInt(generatedDebt);
    }

    /// @dev Gets the whole debt of the Safe
    /// @param _usr Address of the Rai holder
    /// @param _urn Urn of the Safe
    /// @param _collType CollType of the Safe
    function getAllDebt(
        address _usr,
        address _urn,
        bytes32 _collType
    ) internal view returns (uint256 raiAmount) {
        (, uint256 rate, , , , ) = safeEngine.collateralTypes(_collType);
        (, uint256 art) = safeEngine.safes(_collType, _urn);
        uint256 rai = safeEngine.coinBalance(_usr);

        uint256 rad = sub(mul(art, rate), rai);
        raiAmount = rad / RAY;

        raiAmount = mul(raiAmount, RAY) < rad ? raiAmount + 1 : raiAmount;
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}
