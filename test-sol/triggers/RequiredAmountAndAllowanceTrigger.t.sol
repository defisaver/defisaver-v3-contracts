// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

import {
    RequiredAmountAndAllowanceTrigger
} from "../../contracts/triggers/RequiredAmountAndAllowanceTrigger.sol";
import { ISafe } from "../../contracts/interfaces/protocols/safe/ISafe.sol";
import { ISafeProxyFactory } from "../../contracts/interfaces/protocols/safe/ISafeProxyFactory.sol";

import { BaseTest } from "../utils/BaseTest.sol";
import { Addresses } from "../utils/helpers/MainnetAddresses.sol";

contract TestRequiredAmountAndAllowanceTrigger is BaseTest {
    /*//////////////////////////////////////////////////////////////////////////
                                CONTRACT UNDER TEST
    //////////////////////////////////////////////////////////////////////////*/
    RequiredAmountAndAllowanceTrigger cut;

    /*//////////////////////////////////////////////////////////////////////////
                                    VARIABLES
    //////////////////////////////////////////////////////////////////////////*/
    /// @dev Multi-owner Safe. `_fetchOwnerOrWallet` returns the wallet itself (owners != 1),
    ///      so the wallet is the token holder and the allowance branch is skipped
    ///      (tokenHolder == user).
    address walletHeld;

    /// @dev 1/1 Safe. `_fetchOwnerOrWallet` returns the single owner, so the owner is the
    ///      token holder and must approve the wallet (tokenHolder != user, allowance checked).
    address ownerHeld;

    uint256 saltNonce;

    /*//////////////////////////////////////////////////////////////////////////
                                   SETUP FUNCTION
    //////////////////////////////////////////////////////////////////////////*/
    function setUp() public override {
        forkFromEnv("RequiredAmountAndAllowanceTrigger");

        if (isL2NetworkSelected()) {
            vm.skip(true, "RequiredAmountAndAllowanceTrigger test is mainnet only");
        }

        cut = new RequiredAmountAndAllowanceTrigger();

        address[] memory twoOwners = new address[](2);
        twoOwners[0] = bob;
        twoOwners[1] = alice;
        walletHeld = _createSafe(twoOwners);

        address[] memory oneOwner = new address[](1);
        oneOwner[0] = bob;
        ownerHeld = _createSafe(oneOwner);
    }

    /*//////////////////////////////////////////////////////////////////////////
                  TESTS - WALLET HOLDS FUNDS (tokenHolder == user)
    //////////////////////////////////////////////////////////////////////////*/
    /// @dev Balance == desiredAmount must trigger (inclusive `>=` boundary).
    function test_should_trigger_when_wallet_has_exact_balance() public {
        address[4] memory tokens = _tokens();
        for (uint256 i = 0; i < tokens.length; ++i) {
            uint256 amount = _desiredAmount(tokens[i]);
            give(tokens[i], walletHeld, amount);

            assertTrue(
                _isTriggered(walletHeld, tokens[i], amount),
                "wallet balance == desired should trigger"
            );
        }
    }

    function test_should_not_trigger_when_wallet_balance_is_insufficient() public {
        address[4] memory tokens = _tokens();
        for (uint256 i = 0; i < tokens.length; ++i) {
            uint256 amount = _desiredAmount(tokens[i]);
            give(tokens[i], walletHeld, amount - 1);

            assertFalse(
                _isTriggered(walletHeld, tokens[i], amount),
                "wallet balance < desired should not trigger"
            );
        }
    }

    /// @dev With desiredAmount == 0 the check is `balance >= 0`, true even with no funds.
    function test_should_trigger_when_desired_amount_is_zero() public view {
        address[4] memory tokens = _tokens();
        for (uint256 i = 0; i < tokens.length; ++i) {
            assertTrue(
                _isTriggered(walletHeld, tokens[i], 0), "zero desired amount should always trigger"
            );
        }
    }

    /*//////////////////////////////////////////////////////////////////////////
              TESTS - OWNER HOLDS FUNDS (tokenHolder != user, allowance)
    //////////////////////////////////////////////////////////////////////////*/
    /// @dev Owner has both balance and allowance >= desiredAmount -> triggers.
    function test_should_trigger_when_owner_has_balance_and_allowance() public {
        address[4] memory tokens = _tokens();
        for (uint256 i = 0; i < tokens.length; ++i) {
            uint256 amount = _desiredAmount(tokens[i]);

            giveTokenAndApproveAsSender(bob, tokens[i], ownerHeld, amount);
            assertTrue(
                _isTriggered(ownerHeld, tokens[i], amount),
                "owner balance & allowance >= desired should trigger"
            );
        }
    }

    function test_should_not_trigger_when_owner_allowance_is_insufficient() public {
        address[4] memory tokens = _tokens();
        for (uint256 i = 0; i < tokens.length; ++i) {
            uint256 amount = _desiredAmount(tokens[i]);

            // Enough balance, but allowance is one short of the desired amount.
            give(tokens[i], bob, amount);
            approveAsSender(bob, tokens[i], ownerHeld, amount - 1);

            assertFalse(
                _isTriggered(ownerHeld, tokens[i], amount), "allowance < desired should not trigger"
            );
        }
    }

    function test_should_not_trigger_when_owner_balance_is_insufficient() public {
        address[4] memory tokens = _tokens();
        for (uint256 i = 0; i < tokens.length; ++i) {
            uint256 amount = _desiredAmount(tokens[i]);

            // Enough allowance, but balance is one short of the desired amount.
            give(tokens[i], bob, amount - 1);
            approveAsSender(bob, tokens[i], ownerHeld, amount);

            assertFalse(
                _isTriggered(ownerHeld, tokens[i], amount), "balance < desired should not trigger"
            );
        }
    }

    /*//////////////////////////////////////////////////////////////////////////
                              TESTS - STATIC INTERFACE
    //////////////////////////////////////////////////////////////////////////*/
    function test_is_not_changeable() public view {
        assertFalse(cut.isChangeable());
    }

    function test_changed_sub_data_returns_empty() public view {
        assertEq(cut.changedSubData(bytes("")).length, 0);
    }

    function test_parse_call_inputs_decodes_params() public view {
        RequiredAmountAndAllowanceTrigger.CalldataParams memory expected =
            RequiredAmountAndAllowanceTrigger.CalldataParams({
                user: walletHeld, sellTokenAddr: Addresses.WETH_ADDR, desiredAmount: 123
            });

        RequiredAmountAndAllowanceTrigger.CalldataParams memory decoded =
            cut.parseCallInputs(abi.encode(expected));

        assertEq(decoded.user, expected.user);
        assertEq(decoded.sellTokenAddr, expected.sellTokenAddr);
        assertEq(decoded.desiredAmount, expected.desiredAmount);
    }

    /*//////////////////////////////////////////////////////////////////////////
                                     HELPERS
    //////////////////////////////////////////////////////////////////////////*/
    function _tokens() internal pure returns (address[4] memory) {
        return [Addresses.WETH_ADDR, Addresses.USDT_ADDR, Addresses.WBTC_ADDR, Addresses.DAI_ADDR];
    }

    /// @dev A sane non-zero desired amount, scaled to each token's decimals.
    function _desiredAmount(address _token) internal pure returns (uint256) {
        if (_token == Addresses.USDT_ADDR) return 1000e6; // 6 decimals
        if (_token == Addresses.WBTC_ADDR) return 1e8; // 8 decimals
        return 1e18; // WETH and DAI, 18 decimals
    }

    function _isTriggered(address _user, address _token, uint256 _amount)
        internal
        view
        returns (bool)
    {
        return cut.isTriggered(_encode(_user, _token, _amount), bytes(""));
    }

    function _encode(address _user, address _token, uint256 _amount)
        internal
        pure
        returns (bytes memory)
    {
        return abi.encode(
            RequiredAmountAndAllowanceTrigger.CalldataParams({
                user: _user, sellTokenAddr: _token, desiredAmount: _amount
            })
        );
    }

    function _createSafe(address[] memory _owners) internal returns (address) {
        bytes memory setupData = abi.encodeWithSelector(
            ISafe.setup.selector,
            _owners,
            uint256(1), // threshold
            address(0),
            bytes(""),
            address(0),
            address(0),
            uint256(0),
            payable(address(0))
        );

        return ISafeProxyFactory(Addresses.SAFE_PROXY_FACTORY)
            .createProxyWithNonce(Addresses.SAFE_SINGLETON, setupData, ++saltNonce);
    }
}
