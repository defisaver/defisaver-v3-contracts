// SPDX-License-Identifier: MIT

pragma solidity =0.7.6;
pragma experimental ABIEncoderV2;
import "hardhat/console.sol";
import "../ActionBase.sol";
import "../../utils/TokenUtils.sol";
import "../../interfaces/yearn/yVault.sol";
import "../../interfaces/yearn/YearnController.sol";

// @title Supplies tokens to Yearn vault
contract YearnSupply is ActionBase{
    using TokenUtils for address;

    YearnController public constant yearnController = 
        YearnController(0x9E65Ad11b299CA0Abefc2799dDB6314Ef2d91080);

    struct Params {
        address token;
        uint256 amount;
        address from;
        address to;
    }

    /// @inheritdoc ActionBase
    function executeAction(
        bytes[] memory _callData,
        bytes[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public payable virtual override returns (bytes32) {
        Params memory inputData = parseInputs(_callData);

        inputData.amount = _parseParamUint(inputData.amount, _paramMapping[0], _subData, _returnValues);

        uint256 yAmountReceived = _yearnSupply(inputData);
        return bytes32(yAmountReceived);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes[] memory _callData) public payable override {
        Params memory inputData = parseInputs(_callData);

        _yearnSupply(inputData);
        console.log(gasleft());
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    function _yearnSupply(Params memory _inputData) internal returns (uint256 yTokenAmount) {
        uint amountPulled = _inputData.token.pullTokensIfNeeded(_inputData.from, _inputData.amount);

        YVault vault = YVault(yearnController.vaults(_inputData.token));

        _inputData.token.approveToken(address(vault), amountPulled);
        _inputData.amount = amountPulled;

        vault.deposit(_inputData.amount);

        yTokenAmount = vault.balanceOf(address(this));

        if (address(this) != _inputData.to){
            vault.transfer(_inputData.to, vault.balanceOf(address(this)));
        }

        logger.Log(
                address(this),
                msg.sender,
                "YearnSupply",
                abi.encode(_inputData, yTokenAmount)
            );
    }


    function parseInputs(bytes[] memory _callData)
        internal
        pure
        returns (
            Params memory inputData
        )
    {
        inputData = abi.decode(_callData[0], (Params));
    }
}