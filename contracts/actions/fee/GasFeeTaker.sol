// SPDX-License-Identifier: MIT

pragma solidity =0.7.6;
pragma experimental ABIEncoderV2;

import "../../DS/DSMath.sol";
import "../../utils/TokenUtils.sol";
import "../../utils/FeeRecipient.sol";
import "../../interfaces/IDSProxy.sol";
import "../../interfaces/chainlink/IAggregatorV3.sol";
import "../ActionBase.sol";

/// @title Helper action to send a token to the specified address
contract GasFeeTaker is ActionBase, DSMath {

    using TokenUtils for address;

    FeeRecipient public constant feeRecipient =
        FeeRecipient(0x39C4a92Dc506300c3Ea4c67ca4CA611102ee6F2A);

    /// @inheritdoc ActionBase
    function executeAction(
        bytes[] memory _callData,
        bytes[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public virtual payable override returns (bytes32) {
        uint256 gasStart = abi.decode(_callData[0], (uint256));
        address feeToken = abi.decode(_callData[1], (address)); // TODO: no validation here
        address oracleAddr = abi.decode(_callData[2], (address)); // TODO: no validation here
        bytes32 actionId = abi.decode(_callData[3], (bytes32));

        address actionAddr = registry.getAddr(actionId);
        require(actionAddr != address(0), "Action Id not registered");

        // calc gas used
        uint256 gasUsed = gasStart - gasleft();
        uint256 amount = gasUsed * tx.gasprice;

        // convert to token amount
        if (feeToken != TokenUtils.WETH_ADDR) {
            int price = getTokenPrice(oracleAddr);

            amount = wdiv(amount, uint(price)) / (10 ** (18 - feeToken.getTokenDecimals()));
        }

        // TODO: add amount from the fee taking action?

        // execute fee taking action
        IDSProxy(address(this)).execute(actionAddr, _callData[3]);

        // NOTICE: maybe we should add to separate wallet
        feeToken.withdrawTokens(feeRecipient.getFeeAddr(), amount);

        logger.Log(
            address(this),
            msg.sender,
            "GasFeeTaker",
            abi.encode(gasUsed, amount, feeToken) // NOTICE: check if we need to log more
        );

        return bytes32(amount);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes[] memory _callData) public payable override {}

    /// @inheritdoc ActionBase
    function actionType() public virtual override pure returns (uint8) {
        return uint8(ActionType.FEE_ACTION);
    }

     function getTokenPrice(address _oracleAddr) public view returns (int) {
        (, int price, , , ) = IAggregatorV3(_oracleAddr).latestRoundData();

        return price;
    }
    
}
