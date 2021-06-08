// SPDX-License-Identifier: MIT

pragma solidity =0.7.6;
pragma experimental ABIEncoderV2;

import "../../DS/DSMath.sol";
import "../../utils/TokenUtils.sol";
import "../../utils/FeeRecipient.sol";
import "../../interfaces/IDSProxy.sol";
import "../../interfaces/chainlink/IAggregatorV3.sol";
import "../../interfaces/aaveV2/ILendingPoolAddressesProviderV2.sol";
import "../../interfaces/aaveV2/IPriceOracleGetterAave.sol";
import "../ActionBase.sol";

/// @title Helper action to send a token to the specified address
contract GasFeeTaker is ActionBase, DSMath {
    using TokenUtils for address;

    struct Params {
        uint256 gasUsed;
        address feeToken;
        bool payNow;
    }

    FeeRecipient public constant feeRecipient =
        FeeRecipient(0x39C4a92Dc506300c3Ea4c67ca4CA611102ee6F2A);

    address public constant AAVE_V2_MARKET = 0xB53C1a33016B2DC2fF3653530bfF1848a515c8c5;

    uint256 public constant SANITY_GAS_PRICE = 1000 gwei;

    /// @inheritdoc ActionBase
    function executeAction(
        bytes[] memory _callData,
        bytes[] memory,
        uint8[] memory,
        bytes32[] memory
    ) public payable virtual override returns (bytes32) {
        Params memory inputData = parseInputs(_callData);

        uint256 gasPrice = tx.gasprice;

        // gas price must be in a reasonable range
        if (tx.gasprice > SANITY_GAS_PRICE) {
            gasPrice = SANITY_GAS_PRICE;
        }

        // can"t use more gas than the block gas limit
        if (inputData.gasUsed > block.gaslimit) {
            inputData.gasUsed = block.gaslimit;
        }

        // calc gas used
        uint256 txCost = inputData.gasUsed * gasPrice;

        // convert to token amount
        if (inputData.feeToken != TokenUtils.WETH_ADDR) {
            uint256 price = getTokenPrice(inputData.feeToken);
            uint256 tokenDecimals = inputData.feeToken.getTokenDecimals();

            require(tokenDecimals <= 18, "Token decimal too big");

            txCost = wdiv(txCost, uint256(price)) / (10**(18 - tokenDecimals));
        }

        // We can send the fee inside the action or just use the amount and send it later on
        if (inputData.payNow) {
            inputData.feeToken.withdrawTokens(feeRecipient.getFeeAddr(), txCost);
        }

        logger.Log(address(this), msg.sender, "GasFeeTaker", abi.encode(inputData, txCost));

        return bytes32(txCost);
    }

    /// @inheritdoc ActionBase
    // solhint-disable-next-line no-empty-blocks
    function executeActionDirect(bytes[] memory _callData) public payable override {}

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.FEE_ACTION);
    }

    /// @dev Fetches token price from aave oracle which they use in the main market
    function getTokenPrice(address _tokenAddr) public view returns (uint256 price) {
        address priceOracleAddress =
            ILendingPoolAddressesProviderV2(AAVE_V2_MARKET).getPriceOracle();

        price = IPriceOracleGetterAave(priceOracleAddress).getAssetPrice(_tokenAddr);
    }

    function parseInputs(bytes[] memory _callData) internal pure returns (Params memory inputData) {
        inputData = abi.decode(_callData[0], (Params));
    }
}
