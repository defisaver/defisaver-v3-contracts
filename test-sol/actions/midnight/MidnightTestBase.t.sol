// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { IERC20 } from "../../../contracts/interfaces/token/IERC20.sol";
import { IMidnight, Market } from "../../../contracts/interfaces/protocols/midnight/IMidnight.sol";
import { SmartWallet } from "test-sol/utils/SmartWallet.sol";
import { ExecuteActionsBase } from "test-sol/utils/executeActions/ExecuteActionsBase.sol";

abstract contract MidnightTestBase is ExecuteActionsBase {
    IMidnight internal constant MIDNIGHT = IMidnight(0xAdedD8ab6dE832766Fedf0FaC4992E5C4D3EA18A);

    address internal constant TEST_USER = 0x2e3Cc8Cd22812eaa229CbE85f3de7c9a39A8f4f7;
    bytes32 internal constant MARKET_ID =
        0x05959752fdeff325962b9d263edb421efc6e2186a49360dba6c32e86ebf6c84c;
    uint256 internal constant COLLATERAL_INDEX = 0;

    SmartWallet internal wallet;
    address internal walletAddr;
    address internal sender;

    function setUp() public virtual override {
        forkFromEnv("");

        wallet = new SmartWallet(bob);
        sender = wallet.owner();
        walletAddr = wallet.walletAddr();
    }

    function _getMarket() internal view returns (Market memory) {
        return MIDNIGHT.toMarket(MARKET_ID);
    }

    function _getCollateralToken() internal view returns (address) {
        return _getMarket().collateralParams[COLLATERAL_INDEX].token;
    }

    function _getLoanToken() internal view returns (address) {
        return _getMarket().loanToken;
    }

    function _authorizeWalletFor(address _onBehalf) internal {
        vm.prank(_onBehalf);
        MIDNIGHT.setIsAuthorized(walletAddr, true, _onBehalf);

        assertTrue(MIDNIGHT.isAuthorized(_onBehalf, walletAddr));
    }

    function _supplyCollateralToWallet(uint256 _amount) internal {
        Market memory market = _getMarket();
        address collateralToken = market.collateralParams[COLLATERAL_INDEX].token;

        give(collateralToken, walletAddr, _amount);

        vm.startPrank(walletAddr);
        IERC20(collateralToken).approve(address(MIDNIGHT), _amount);
        MIDNIGHT.supplyCollateral(market, COLLATERAL_INDEX, _amount, walletAddr);
        vm.stopPrank();

        assertEq(MIDNIGHT.collateral(MARKET_ID, walletAddr, COLLATERAL_INDEX), _amount);
        _assertNoWalletResidue(collateralToken);
    }

    function _clearDebt(address _user) internal {
        uint256 debt = MIDNIGHT.debt(MARKET_ID, _user);
        if (debt == 0) return;

        address loanToken = _getLoanToken();
        Market memory market = _getMarket();
        give(loanToken, _user, debt);
        approveAsSender(_user, loanToken, address(MIDNIGHT), debt);

        vm.prank(_user);
        MIDNIGHT.repay(market, debt, _user, address(0), "");

        assertEq(MIDNIGHT.debt(MARKET_ID, _user), 0);
    }

    /// @dev Midnight.position is the first storage variable. Debt is the lower uint128
    /// in the third slot of Position. This avoids building a real offer/take borrow fixture.
    function _seedWalletDebt(uint128 _debt) internal {
        bytes32 innerMappingSlot = keccak256(abi.encode(MARKET_ID, uint256(0)));
        bytes32 positionSlot = keccak256(abi.encode(walletAddr, innerMappingSlot));
        bytes32 debtAndBitmapSlot = bytes32(uint256(positionSlot) + 2);

        uint256 currentValue = uint256(vm.load(address(MIDNIGHT), debtAndBitmapSlot));
        uint256 updatedValue = (currentValue & ~uint256(type(uint128).max)) | uint256(_debt);
        vm.store(address(MIDNIGHT), debtAndBitmapSlot, bytes32(updatedValue));

        assertEq(MIDNIGHT.debt(MARKET_ID, walletAddr), _debt);
    }

    function _fundSenderAndApproveWallet(address _token, uint256 _amount) internal {
        give(_token, sender, _amount);
        approveAsSender(sender, _token, walletAddr, _amount);
    }

    function _assertNoWalletResidue(address _token) internal view {
        assertEq(balanceOf(_token, walletAddr), 0);
        assertEq(IERC20(_token).allowance(walletAddr, address(MIDNIGHT)), 0);
    }
}
