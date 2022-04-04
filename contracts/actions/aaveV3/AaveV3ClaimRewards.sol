// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;

import "../../utils/TokenUtils.sol";
import "../ActionBase.sol";
import "./helpers/AaveV3Helper.sol";
import "../../interfaces/aaveV3/IRewardsController.sol";

/// @title Supply a token to an Aave market
contract AaveV3ClaimRewards is ActionBase, AaveV3Helper {
    using TokenUtils for address;

    struct Params {
        uint8 assetsLength;
        uint256 amount;
        address to;
        address reward;
        address[] assets;
    }

    /// @inheritdoc ActionBase
    function executeAction(
        bytes calldata _callData,
        bytes32[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public payable virtual override returns (bytes32) {
        Params memory params = parseInputs(_callData);

        params.amount = _parseParamUint(params.amount, _paramMapping[0], _subData, _returnValues);
        params.to = _parseParamAddr(params.to, _paramMapping[1], _subData, _returnValues);
        
        (uint256 amountReceived, bytes memory logData) = _claimRewards(params);

        emit ActionEvent("AaveV3ClaimRewards", logData);
        return bytes32(amountReceived);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes calldata _callData) public payable override {
        Params memory params = parseInputs(_callData);

        (, bytes memory logData) = _claimRewards(params);
        //logger.logActionDirectEvent("AaveV3Supply", logData);
    }

    function executeActionDirectL2() public payable {
        Params memory params = decodeInputs(msg.data[4:]);

        (, bytes memory logData) = _claimRewards(params);
        //logger.logActionDirectEvent("AaveV3Supply", logData);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    function _claimRewards(Params memory params) internal returns (uint256 amountReceived, bytes memory) {
        IRewardsController rewardsController = IRewardsController(REWARDS_CONTROLLER_ADDRESS);

        uint256 balanceBefore = params.reward.getBalance(params.to);

        rewardsController.claimRewards(params.assets, params.amount, params.to, params.reward);
    
        amountReceived = params.reward.getBalance(params.to) - balanceBefore;

        bytes memory logData = abi.encode(params, amountReceived);
        return (amountReceived, logData);
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }

    function encodeInputs(Params memory params) public pure returns (bytes memory encodedInput) {
        require(params.assetsLength == params.assets.length);

        encodedInput = bytes.concat(this.executeActionDirectL2.selector);

        encodedInput = bytes.concat(encodedInput, bytes1(params.assetsLength));

        encodedInput = bytes.concat(encodedInput, bytes32(params.amount));

        encodedInput = bytes.concat(encodedInput, bytes20(params.to));

        encodedInput = bytes.concat(encodedInput, bytes20(params.reward));

        for (uint256 i = 0; i < params.assetsLength; i++){
            encodedInput = bytes.concat(encodedInput, bytes20(params.assets[i]));
        }
    }

    function decodeInputs(bytes calldata encodedInput) public pure returns (Params memory params) {
        params.assetsLength = uint8(bytes1(encodedInput[0:1]));

        params.amount = uint256(bytes32(encodedInput[1:33]));

        params.to = address(bytes20(encodedInput[33:53]));

        params.reward = address(bytes20(encodedInput[53:73]));

        address[] memory assets = new address[](params.assetsLength);
        for (uint256 i = 0; i < params.assetsLength; i++){
            assets[i] = address(bytes20(encodedInput[73+20*i : 93+20*i]));
        }
        params.assets = assets;
    }
}
