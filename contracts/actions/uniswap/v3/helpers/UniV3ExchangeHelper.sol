// SPDX-License-Identifier: MIT
pragma solidity =0.8.10;

import "../../../../interfaces/IDSProxy.sol";
import "../../../../utils/TokenUtils.sol";
import "../../../../utils/Discount.sol";
import "../../../../utils/FeeRecipient.sol";
import "../../../../exchangeV3/helpers/MainnetExchangeAddresses.sol";

contract UniV3ExchangeHelper is MainnetExchangeAddresses {
    using TokenUtils for address;

    uint256 internal constant RECIPE_FEE = 400;

    /// @notice Returns the owner of the DSProxy that called the contract
    function getUserAddress() internal view returns (address) {
        IDSProxy proxy = IDSProxy(payable(address(this)));

        return proxy.owner();
    }

    /// @notice Takes a feePercentage and sends it to wallet
    /// @param _amount Dai amount of the whole trade
    /// @param _user Address of the user
    /// @param _token Address of the token
    /// @param _dfsFeeDivider Dfs fee divider
    /// @return feeAmount Amount in Dai owner earned on the fee
    function getFee(
        uint256 _amount,
        address _user,
        address _token,
        uint256 _dfsFeeDivider
    ) internal returns (uint256 feeAmount) {
        if (_dfsFeeDivider != 0 && Discount(DISCOUNT_ADDRESS).isCustomFeeSet(_user)) {
            _dfsFeeDivider = Discount(DISCOUNT_ADDRESS).getCustomServiceFee(_user);
        }
        if (_dfsFeeDivider == 0) {
            feeAmount = 0;
        } else {
            feeAmount = _amount / _dfsFeeDivider;

            // fee can't go over 10% of the whole amount
            if (feeAmount > (_amount / 10)) {
                feeAmount = _amount / 10;
            }
            address walletAddr = FeeRecipient(FEE_RECIPIENT_ADDRESS).getFeeAddr();
            _token.withdrawTokens(walletAddr, feeAmount);
        }
    }
}