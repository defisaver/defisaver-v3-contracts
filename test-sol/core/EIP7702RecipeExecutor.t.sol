// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { BaseTest } from "../utils/BaseTest.sol";

import { EIP7702RecipeExecutor } from "../../contracts/core/EIP7702RecipeExecutor.sol";
import { DefisaverLogger } from "../../contracts/utils/DefisaverLogger.sol";
import { MockDFSRegistry } from "../../contracts/mocks/MockDFSRegistry.sol";
import { StrategyModel } from '../../contracts/core/strategy/StrategyModel.sol';
import { MockERC20 } from "../../contracts/mocks/MockERC20.sol";
import { ActionsUtils } from "../utils/ActionsUtils.sol";
import { Vm } from "forge-std/Vm.sol";

// actions
import { PullToken } from "../../contracts/actions/utils/PullToken.sol";
import { SendToken } from "../../contracts/actions/utils/SendToken.sol";
import { SumInputs } from "../../contracts/actions/utils/SumInputs.sol";
import { TokenBalance } from "../../contracts/actions/utils/TokenBalance.sol";
import { FLAction } from "../../contracts/actions/flashloan/FLAction.sol";
import { MockFLBalancer } from "../../contracts/mocks/MockFLBalancer.sol";
import { MockDSProxyFactory } from "../../contracts/mocks/MockDSProxyFactory.sol";
contract TestEIP7702RecipeExecutor is BaseTest, ActionsUtils {
    
    /*//////////////////////////////////////////////////////////////////////////
                               CONTRACT UNDER TEST
    //////////////////////////////////////////////////////////////////////////*/
    EIP7702RecipeExecutor cut;

    /*//////////////////////////////////////////////////////////////////////////
                                    VARIABLES
    //////////////////////////////////////////////////////////////////////////*/
    DefisaverLogger logger;
    MockDFSRegistry registry;

    Vm.Wallet BOB = vm.createWallet("bob");
    Vm.Wallet ALICE = vm.createWallet("alice");
    Vm.Wallet JOHN = vm.createWallet("john");
    Vm.Wallet SAM = vm.createWallet("sam");

    struct LocalVars {
        MockERC20 token;
        uint256 amount;

        uint256 bobBalanceBefore;
        uint256 aliceBalanceBefore;
        uint256 johnBalanceBefore;
        uint256 samBalanceBefore;

        uint256 bobBalanceAfter;
        uint256 aliceBalanceAfter;
        uint256 johnBalanceAfter;
        uint256 samBalanceAfter;
    }

    /*//////////////////////////////////////////////////////////////////////////
                                  SETUP FUNCTION
    //////////////////////////////////////////////////////////////////////////*/
    function setUp() public override {
        forkLocalAnvil();

        logger = new DefisaverLogger();
        registry = new MockDFSRegistry();
        
        cut = new EIP7702RecipeExecutor(address(registry), address(logger));

        _deployAndAddTestActionsToRegistry();    
    }

    /*//////////////////////////////////////////////////////////////////////////
                                     TESTS
    //////////////////////////////////////////////////////////////////////////*/
    function test_simple_executeRecipe() public {
        // BOB will set EIP7702RecipeExecutor contract as delegate
        _signDelegation(BOB, address(cut));

        LocalVars memory vars;

        // create mock token and mint to all users
        vars.token = new MockERC20("TestToken", "TEST");
        vars.amount = 1 ether;
        vars.token.mint(BOB.addr, vars.amount);
        vars.token.mint(ALICE.addr, vars.amount);
        vars.token.mint(JOHN.addr, vars.amount);
        vars.token.mint(SAM.addr, vars.amount);

        // approve to spent amount from ALICE
        vm.prank(ALICE.addr);
        vars.token.approve(BOB.addr, vars.amount);

        // approve to spent amount from JOHN
        vm.prank(JOHN.addr);
        vars.token.approve(BOB.addr, vars.amount);

        // Create a simple recipe which BOB will execute from his delegated account:
        // 1. Fetch current BOB token balance
        // 2. Pull tokens from ALICE
        // 3. Pull tokens from JOHN
        // 4. Sum Inputs (BOB_BALANCE + PULLED_FROM_ALICE)
        // 5. Sum Inputs ((BOB_BALANCE + PULLED_FROM_ALICE) + PULLED_FROM_JOHN)
        // 6. Send tokens to SAM

        bytes[] memory actionsCalldata = new bytes[](6);
        actionsCalldata[0] = tokenBalanceEncode(address(vars.token), BOB.addr);
        actionsCalldata[1] = pullTokenEncode(address(vars.token), ALICE.addr, vars.amount);
        actionsCalldata[2] = pullTokenEncode(address(vars.token), JOHN.addr, vars.amount);
        actionsCalldata[3] = sumInputsEncode(0, 0); // amounts will be piped from previous actions
        actionsCalldata[4] = sumInputsEncode(0, 0); // amounts will be piped from previous actions
        actionsCalldata[5] = sendTokenEncode(address(vars.token), SAM.addr, 0); // amount will be piped from previous actions

        bytes4[] memory ids = new bytes4[](6);
        ids[0] = bytes4(keccak256("TokenBalance"));
        ids[1] = bytes4(keccak256("PullToken"));
        ids[2] = bytes4(keccak256("PullToken"));
        ids[3] = bytes4(keccak256("SumInputs"));
        ids[4] = bytes4(keccak256("SumInputs"));
        ids[5] = bytes4(keccak256("SendToken"));

        // initialize empty paramMap
        uint8[][] memory paramMap = new uint8[][](ids.length);
        for (uint256 i = 0; i < ids.length; i++) paramMap[i] = new uint8[](5);

        // first SumInputs action will use return values from 1st and 2nd action (BOB_BALANCE + PULLED_FROM_ALICE)
        paramMap[3][0] = 1;
        paramMap[3][1] = 2;

        // second SumInputs action will use return values from 3rd and 4th action (PULLED_FROM_JOHN + (BOB_BALANCE + PULLED_FROM_ALICE))
        paramMap[4][0] = 3;
        paramMap[4][1] = 4;

        // sendToken action will use return value for 'amount' from second SumInputs action
        paramMap[5][2] = 5;

        StrategyModel.Recipe memory recipe = StrategyModel.Recipe({
            name: "TestRecipe",
            callData: actionsCalldata,
            subData: new bytes32[](0),
            actionIds: ids,
            paramMapping: paramMap
        });

        vars.bobBalanceBefore = vars.token.balanceOf(BOB.addr);
        vars.aliceBalanceBefore = vars.token.balanceOf(ALICE.addr);
        vars.johnBalanceBefore = vars.token.balanceOf(JOHN.addr);
        vars.samBalanceBefore = vars.token.balanceOf(SAM.addr);

        // First show that execution fill fail when BOB is not the caller
        vm.prank(ALICE.addr);
        vm.expectRevert("Unauthorized()");
        EIP7702RecipeExecutor(payable(BOB.addr)).executeRecipe(recipe);

        vm.prank(BOB.addr);
        // Bob is executing the recipe from his context, because code of EIP7702RecipeExecutor is attached to his address
        EIP7702RecipeExecutor(payable(BOB.addr)).executeRecipe(recipe);

        vars.bobBalanceAfter = vars.token.balanceOf(BOB.addr);
        vars.aliceBalanceAfter = vars.token.balanceOf(ALICE.addr);
        vars.johnBalanceAfter = vars.token.balanceOf(JOHN.addr);
        vars.samBalanceAfter = vars.token.balanceOf(SAM.addr);
        
        assertEq(vars.bobBalanceAfter, vars.bobBalanceBefore - vars.amount);
        assertEq(vars.aliceBalanceAfter, vars.aliceBalanceBefore - vars.amount);
        assertEq(vars.johnBalanceAfter, vars.johnBalanceBefore - vars.amount);
        assertEq(vars.samBalanceAfter, vars.samBalanceBefore + vars.amount * 3);
    }

    function test_executeRecipe_with_flashloan() public {
        // BOB will set EIP7702RecipeExecutor contract as delegate
        _signDelegation(BOB, address(cut));

        // set FLAction address to registry
        FLAction flAction = new FLAction();
        registry.setAddr(bytes4(keccak256("FLAction")), address(flAction));

        // set MockFLBalancer and replace VAULT address code
        address vaultAddr = 0xBA12222222228d8Ba445958a75a0704d566BF2C8;
        vm.etch(vaultAddr, address(new MockFLBalancer()).code);

        // Create mock token and mint to vaultAddr
        MockERC20 token = new MockERC20("TestToken", "TEST");
        token.mint(vaultAddr, 100 ether);

        // Mock ds proxy factory
        vm.etch(0xA26e15C895EFc0616177B7c1e7270A4C7D51C997, address(new MockDSProxyFactory()).code);

        bytes[] memory actionsCalldata = new bytes[](2);
        actionsCalldata[0] = flActionEncode(address(token), 10 ether, FLSource.BALANCER);
        actionsCalldata[1] = sendTokenEncode(address(token), address(flAction), 10 ether);

        bytes4[] memory ids = new bytes4[](2);
        ids[0] = bytes4(keccak256("FLAction"));
        ids[1] = bytes4(keccak256("SendToken"));

        uint8[][] memory paramMap = new uint8[][](ids.length);
        for (uint256 i = 0; i < ids.length; i++) paramMap[i] = new uint8[](6);

        StrategyModel.Recipe memory recipe = StrategyModel.Recipe({
            name: "TestRecipeWithFlashloan",
            callData: actionsCalldata,
            subData: new bytes32[](0),
            actionIds: ids,
            paramMapping: paramMap
        });

        uint256 senderTokenBalanceBefore = token.balanceOf(BOB.addr);
        uint256 flActionTokenBalanceBefore = token.balanceOf(address(flAction));
        uint256 recipeExecutorTokenBalanceBefore = token.balanceOf(address(cut));

        // First show that execution fill fail when BOB is not the caller
        vm.prank(ALICE.addr);
        vm.expectRevert("Unauthorized()");
        EIP7702RecipeExecutor(payable(BOB.addr)).executeRecipe(recipe);
        // It will also fail if we try to call it as fl recipe
        vm.prank(ALICE.addr);
        vm.expectRevert("Unauthorized()");
        EIP7702RecipeExecutor(payable(BOB.addr))._executeActionsFromFL(recipe, 0);

        vm.prank(BOB.addr);
        // Bob is executing the recipe from his context, because code of EIP7702RecipeExecutor is attached to his address
        EIP7702RecipeExecutor(payable(BOB.addr)).executeRecipe(recipe);

        uint256 senderTokenBalanceAfter = token.balanceOf(BOB.addr);
        uint256 flActionTokenBalanceAfter = token.balanceOf(address(flAction));
        uint256 recipeExecutorTokenBalanceAfter = token.balanceOf(address(cut));

        assertEq(senderTokenBalanceBefore, senderTokenBalanceAfter);
        assertEq(flActionTokenBalanceBefore, flActionTokenBalanceAfter);
        assertEq(recipeExecutorTokenBalanceBefore, recipeExecutorTokenBalanceAfter);
    }

    /*//////////////////////////////////////////////////////////////////////////
                                     HELPERS
    //////////////////////////////////////////////////////////////////////////*/

    function _signDelegation(Vm.Wallet memory _signer, address _delegatee) internal {
        // sign delegation from _signer to _delegatee
        vm.signAndAttachDelegation(_delegatee, _signer.privateKey);
        // send delegation tx (can be done by anyone)
        (bool success, ) = address(0).call("");
        require(success, "Delegation failed");
        // assert that _signer has some code attached to it
        assertGt(_signer.addr.code.length, 0);
    }

    function _deployAndAddTestActionsToRegistry() internal {
        // deploy actions
        PullToken pullToken = new PullToken();
        SendToken sendToken = new SendToken();
        SumInputs sumInputs = new SumInputs();
        TokenBalance tokenBalance = new TokenBalance();

        // add actions to registry
        registry.setAddr(bytes4(keccak256("PullToken")), address(pullToken));
        registry.setAddr(bytes4(keccak256("SendToken")), address(sendToken));
        registry.setAddr(bytes4(keccak256("SumInputs")), address(sumInputs));
        registry.setAddr(bytes4(keccak256("TokenBalance")), address(tokenBalance));
    }
}
