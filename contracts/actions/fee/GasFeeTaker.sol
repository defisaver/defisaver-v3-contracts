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

    FeeRecipient public constant feeRecipient =
        FeeRecipient(0x39C4a92Dc506300c3Ea4c67ca4CA611102ee6F2A);

    address public constant AAVE_V2_MARKET = 0xB53C1a33016B2DC2fF3653530bfF1848a515c8c5;

    uint256 public constant SANITY_GAS_PRICE = 1000 gwei;

    /// @inheritdoc ActionBase
    function executeAction(
        bytes[] memory _callData,
        bytes[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public virtual payable override returns (bytes32) {
        uint256 gasUsed = abi.decode(_callData[0], (uint256));
        address feeToken = abi.decode(_callData[1], (address));
        bool payNow = abi.decode(_callData[2], (bool));

        uint256 gasPrice = tx.gasprice;
        if (tx.gasprice > SANITY_GAS_PRICE) {
            gasPrice = SANITY_GAS_PRICE;
        }

        // calc gas used
        uint256 txCost = gasUsed * gasPrice;

        // convert to token amount
        if (feeToken != TokenUtils.WETH_ADDR) {
            uint price = getTokenPrice(feeToken);

            // TODO: over 18 decimal bug
            txCost = wdiv(txCost, uint(price)) / (10 ** (18 - feeToken.getTokenDecimals()));
        }

        if (payNow) {
            feeToken.withdrawTokens(feeRecipient.getFeeAddr(), txCost);
        }

        logger.Log(
            address(this),
            msg.sender,
            "GasFeeTaker",
            abi.encode(gasUsed, txCost, feeToken)
        );

        return bytes32(txCost);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes[] memory _callData) public payable override {}

    /// @inheritdoc ActionBase
    function actionType() public virtual override pure returns (uint8) {
        return uint8(ActionType.FEE_ACTION);
    }

    /// @dev Fetches token price from aave oracle which they use in the main market
     function getTokenPrice(address _tokenAddr) public view returns (uint price) {
        address priceOracleAddress = ILendingPoolAddressesProviderV2(AAVE_V2_MARKET).getPriceOracle();

        price = IPriceOracleGetterAave(priceOracleAddress).getAssetPrice(_tokenAddr);
    }
    
}
