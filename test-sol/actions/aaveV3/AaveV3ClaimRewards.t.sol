// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;

import { AaveV3ClaimRewards } from "../../../contracts/actions/aaveV3/AaveV3ClaimRewards.sol";
import { MockRewardsController } from "./mocks/MockRewardsController.sol";
import { AaveV3Helper } from "../../../contracts/actions/aaveV3/helpers/AaveV3Helper.sol";

import { BaseTest } from "../../utils/BaseTest.sol";
import { SmartWallet } from "../../utils/SmartWallet.sol";
import { ActionsUtils } from "../../utils/ActionsUtils.sol";
 
/// @notice Testing interaction with mock contract as claiming rewards is deprecated
contract TestAaveV3ClaimRewards is AaveV3Helper, ActionsUtils, BaseTest {
    
    /*//////////////////////////////////////////////////////////////////////////
                                CONTRACT UNDER TEST
    //////////////////////////////////////////////////////////////////////////*/
    AaveV3ClaimRewards cut;

    /*//////////////////////////////////////////////////////////////////////////
                                    VARIABLES
    //////////////////////////////////////////////////////////////////////////*/
    SmartWallet wallet;
    address walletAddr;
    address sender;

    /*//////////////////////////////////////////////////////////////////////////
                                   SETUP FUNCTION
    //////////////////////////////////////////////////////////////////////////*/
    function setUp() public override {
        forkMainnet("AaveV3ClaimRewards");

        wallet = new SmartWallet(bob);
        sender = wallet.owner();
        walletAddr = wallet.walletAddr();

        cut = new AaveV3ClaimRewards();
        vm.etch(AAVE_REWARDS_CONTROLLER_ADDRESS, address(new MockRewardsController()).code);
    }

    /*//////////////////////////////////////////////////////////////////////////
                                      TESTS
    //////////////////////////////////////////////////////////////////////////*/
    function test_should_execute_claim_rewards() public {
        _claim(false);
    }
    
    function test_should_execute_claim_rewards_direct() public {
        _claim(true);
    }

    function testFuzz_encode_decode_inputs(
        uint256 _amount,
        address _to,
        address _reward,
        address[2] memory _assets
    ) public {
        address[] memory assets = new address[](2);
        assets[0] = _assets[0];
        assets[1] = _assets[1];

        AaveV3ClaimRewards.Params memory params = AaveV3ClaimRewards.Params({
            amount: _amount,
            to: _to,
            reward: _reward,
            assets: assets,
            assetsLength: 2
        });
        _assertParams(params);
    }

    /*//////////////////////////////////////////////////////////////////////////
                                       HELPERS
    //////////////////////////////////////////////////////////////////////////*/
    function _assertParams(AaveV3ClaimRewards.Params memory _params) private {
        bytes memory encodedInputWithoutSelector = removeSelector(cut.encodeInputs(_params));
        AaveV3ClaimRewards.Params memory decodedParams = cut.decodeInputs(encodedInputWithoutSelector);
        
        assertEq(decodedParams.amount, _params.amount);
        assertEq(decodedParams.to, _params.to);
        assertEq(decodedParams.reward, _params.reward);
        assertEq(decodedParams.assetsLength, _params.assetsLength);
        for (uint256 i = 0; i < _params.assetsLength; i++) {
            assertEq(decodedParams.assets[i], _params.assets[i]);
        }
    }

    /// @dev Just checking execution of the action as we are interacting with a mock contract
    function _claim(bool _isL2Direct) public {
        if (_isL2Direct) {
            AaveV3ClaimRewards.Params memory params = AaveV3ClaimRewards.Params({
                amount: 100,
                to: sender,
                reward: address(0),
                assets: new address[](0),
                assetsLength: 0
            });
            
            wallet.execute(address(cut), cut.encodeInputs(params), 0);

        } else {
            bytes memory paramsCallData = aaveV3ClaimRewardsEncode(
                100,
                sender,
                address(0),
                new address[](0)
            );

            bytes memory _calldata = abi.encodeWithSelector(
                AaveV3ClaimRewards.executeAction.selector,
                paramsCallData,
                subData,
                paramMapping,
                returnValues
            );

            wallet.execute(address(cut), _calldata, 0);
        }
    }
}
