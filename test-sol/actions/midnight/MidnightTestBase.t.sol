// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { IERC20 } from "../../../contracts/interfaces/token/IERC20.sol";
import { Market } from "../../../contracts/interfaces/protocols/midnight/IMidnight.sol";
import { MidnightHelper } from "../../../contracts/actions/midnight/helpers/MidnightHelper.sol";
import { SmartWallet } from "test-sol/utils/SmartWallet.sol";
import { ExecuteActionsBase } from "test-sol/utils/executeActions/ExecuteActionsBase.sol";

abstract contract MidnightTestBase is ExecuteActionsBase, MidnightHelper {
    bytes32 internal constant MAINNET_CBBTC_MARKET =
        0x2a9ae59053a64e409e819d3b76750948e06065b3164278915eb80cb1b7474b65;
    bytes32 internal constant MAINNET_WBTC_MARKET =
        0x6dae37424723dd8cef0da2db84fd2819f7dfa4e3a98e602ccc3c65ee1fac61c2;

    SmartWallet internal wallet;
    address internal walletAddr;
    address internal sender;
    address internal testUser;
    bytes32 internal marketId;
    uint256 internal collateralIndex;

    function setUp() public virtual override {
        forkFromEnv("");

        wallet = new SmartWallet(bob);
        sender = wallet.owner();
        walletAddr = wallet.walletAddr();
        testUser = makeAddr("testUser");
    }

    function _getMarketIds() internal view returns (bytes32[] memory marketIds) {
        if (isMainnetSelected()) {
            marketIds = new bytes32[](2);
            marketIds[0] = MAINNET_CBBTC_MARKET;
            marketIds[1] = MAINNET_WBTC_MARKET;
            return marketIds;
        }

        if (isBaseSelected()) {
            marketIds = new bytes32[](4);
            marketIds[0] = 0x549cd072daf99328554f3a6d2d4d6f4a07f1c59369e891e6391946f9cf75f221;
            marketIds[1] = 0x99fbed74bc7cef3c90d68709d8de8f820261a45875ca197a0e65338affd09481;
            marketIds[2] = 0x9b7fed2a6b24c47b8995dfa4fb2b4bc87fe245c10fb842865e568611a96804aa;
            marketIds[3] = 0x74e310372280cc5c648a1f185db1ee906d2985a7dab8119568a9213f083efec0;
            return marketIds;
        }

        revert("No Midnight markets for chain");
    }

    function _setMarket(bytes32 _marketId) internal {
        marketId = _marketId;
        collateralIndex = _marketId == MAINNET_CBBTC_MARKET ? 1 : 0;
    }

    function _getMarket() internal view returns (Market memory) {
        return MIDNIGHT.toMarket(marketId);
    }

    function _getCollateralToken() internal view returns (address) {
        return _getMarket().collateralParams[collateralIndex].token;
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
        _supplyCollateral(walletAddr, _amount);
        _assertNoWalletResidue(_getCollateralToken());
    }

    function _supplyCollateral(address _user, uint256 _amount) internal {
        Market memory market = _getMarket();
        address collateralToken = market.collateralParams[collateralIndex].token;

        give(collateralToken, _user, _amount);

        vm.startPrank(_user);
        IERC20(collateralToken).approve(address(MIDNIGHT), _amount);
        MIDNIGHT.supplyCollateral(market, collateralIndex, _amount, _user);
        vm.stopPrank();

        assertEq(MIDNIGHT.collateral(marketId, _user, collateralIndex), _amount);
    }

    /// @dev Midnight.position is the first storage variable. Debt is the lower uint128
    /// in the third slot of Position. This avoids building a real offer/take borrow fixture.
    function _seedDebt(address _user, uint128 _debt) internal {
        bytes32 innerMappingSlot = keccak256(abi.encode(marketId, uint256(0)));
        bytes32 positionSlot = keccak256(abi.encode(_user, innerMappingSlot));
        bytes32 debtAndBitmapSlot = bytes32(uint256(positionSlot) + 2);

        uint256 currentValue = uint256(vm.load(address(MIDNIGHT), debtAndBitmapSlot));
        uint256 updatedValue = (currentValue & ~uint256(type(uint128).max)) | uint256(_debt);
        vm.store(address(MIDNIGHT), debtAndBitmapSlot, bytes32(updatedValue));

        assertEq(MIDNIGHT.debt(marketId, _user), _debt);
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
