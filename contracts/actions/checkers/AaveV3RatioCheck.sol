// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import {ActionBase} from "../ActionBase.sol";
import {AaveV3RatioHelper} from "../aaveV3/helpers/AaveV3RatioHelper.sol";
import {TransientStorage} from "../../utils/TransientStorage.sol";

/// @title Action to check the ratio of the Aave V3 position after strategy execution.
contract AaveV3RatioCheck is ActionBase, AaveV3RatioHelper {
    /// @notice 5% offset acceptable
    uint256 internal constant RATIO_OFFSET = 5e16;

    TransientStorage public constant tempStorage = TransientStorage(TRANSIENT_STORAGE);

    error BadAfterRatio(uint256 startRatio, uint256 currRatio);

    enum RatioState {
        IN_BOOST,
        IN_REPAY
    }

    /// @param ratioState State of the ratio (IN_BOOST or IN_REPAY)
    /// @param targetRatio Target ratio.
    /// @param market Aave V3 Market parameter that was added later in order to add support for different markets in strategies
    /// @param user EOA or Smart Wallet address parameter that was added later in order to add support for EOA strategies
    struct Params {
        RatioState ratioState;
        uint256 targetRatio;
        address market;
        address user;
    }

    /// @inheritdoc ActionBase
    function executeAction(
        bytes memory _callData,
        bytes32[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public payable virtual override returns (bytes32) {
        Params memory inputData = parseInputs(_callData);

        uint256 ratioState = _parseParamUint(uint256(inputData.ratioState), _paramMapping[0], _subData, _returnValues);
        uint256 targetRatio = _parseParamUint(uint256(inputData.targetRatio), _paramMapping[1], _subData, _returnValues);

        address market;
        address user;
        /// @dev Those params are added later, hence the check
        if (_paramMapping.length == 4) {
            market = _parseParamAddr(inputData.market, _paramMapping[2], _subData, _returnValues);
            user = _parseParamAddr(inputData.user, _paramMapping[3], _subData, _returnValues);
        }

        if (market == address(0)) market = DEFAULT_AAVE_MARKET; // if not specified -> default to default market
        if (user == address(0)) user = address(this); // default to proxy

        uint256 currRatio = getRatio(market, user);

        uint256 startRatio = uint256(tempStorage.getBytes32("AAVE_RATIO"));

        // if we are doing repay
        if (RatioState(ratioState) == RatioState.IN_REPAY) {
            // if repay ratio should be better off
            if (currRatio <= startRatio) {
                revert BadAfterRatio(startRatio, currRatio);
            }

            // can't repay too much over targetRatio so we don't trigger boost after
            if (currRatio > (targetRatio + RATIO_OFFSET)) {
                revert BadAfterRatio(startRatio, currRatio);
            }
        }

        // if we are doing boost
        if (RatioState(ratioState) == RatioState.IN_BOOST) {
            // if boost ratio should be less
            if (currRatio >= startRatio) {
                revert BadAfterRatio(startRatio, currRatio);
            }

            // can't boost too much under targetRatio so we don't trigger repay after
            if (currRatio < (targetRatio - RATIO_OFFSET)) {
                revert BadAfterRatio(targetRatio, currRatio);
            }
        }

        emit ActionEvent("AaveV3RatioCheck", abi.encode(currRatio));
        return bytes32(currRatio);
    }

    /// @inheritdoc ActionBase
    // solhint-disable-next-line no-empty-blocks
    function executeActionDirect(bytes memory _callData) public payable override {}

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.CHECK_ACTION);
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory inputData) {
        inputData = abi.decode(_callData, (Params));
    }
}
