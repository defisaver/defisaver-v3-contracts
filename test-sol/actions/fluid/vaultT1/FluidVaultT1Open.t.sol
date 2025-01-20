
import { IFluidVaultT1 } from "../../../../contracts/interfaces/fluid/IFluidVaultT1.sol";
import { FluidVaultT1Open } from "../../../../contracts/actions/fluid/vaultT1/FluidVaultT1Open.sol";
import { FluidTestHelper } from "../FluidTestHelper.t.sol";

import { SmartWallet } from "../../../utils/SmartWallet.sol";
import { BaseTest } from "../../../utils/BaseTest.sol";
import { ActionsUtils } from "../../../utils/ActionsUtils.sol";

contract TestFluidVaultT1Open is BaseTest, FluidTestHelper, ActionUtils {

    /*//////////////////////////////////////////////////////////////////////////
                                CONTRACT UNDER TEST
    //////////////////////////////////////////////////////////////////////////*/
    FluidVaultT1Open cut;

    /*//////////////////////////////////////////////////////////////////////////
                                    VARIABLES
    //////////////////////////////////////////////////////////////////////////*/

    SmartWallet wallet;
    address sender;
    address walletAddr;
    IFluidVaultT1[] vaults;

    /*//////////////////////////////////////////////////////////////////////////
                                   SETUP FUNCTION
    //////////////////////////////////////////////////////////////////////////*/
    function setUp() public override {
        forkMainnetLatest();
        initTestPairs("FluidVaultT1");

        wallet = new SmartWallet(bob);
        sender = wallet.owner();
        walletAddr = wallet.walletAddr();

        cut = new FluidVaultT1Open();

        vaults = getT1Vaults();
    }

    /*//////////////////////////////////////////////////////////////////////////
                                      TESTS
    ////////////////////////////////////////////////////////////////////////*/
    function test_should_open_position() public {
        bool isDirect = false;
        bool takeMaxUint256 = false;
        uint256 collateralAmountInUSD = 30000;
        uint256 borrowAmountInUSD = 10000;
        _baseTest(isDirect, takeMaxUint256, collateralAmountInUSD, borrowAmountInUSD);
    }
    function test_should_open_position_direct_action() public {
        bool isDirect = true;
        bool takeMaxUint256 = false;
        uint256 collateralAmountInUSD = 30000;
        uint256 borrowAmountInUSD = 10000;
        _baseTest(isDirect, takeMaxUint256, collateralAmountInUSD, borrowAmountInUSD);
    }
    function test_should_open_position_with_maxUint256() public {
        bool isDirect = false;
        bool takeMaxUint256 = true;
        uint256 collateralAmountInUSD = 30000;
        uint256 borrowAmountInUSD = 10000;
        _baseTest(isDirect, takeMaxUint256, collateralAmountInUSD, borrowAmountInUSD);
    }
    function test_should_open_only_supply_position() public {
        bool isDirect = false;
        bool takeMaxUint256 = false;
        uint256 collateralAmountInUSD = 30000;
        uint256 borrowAmountInUSD = 0;
        _baseTest(isDirect, takeMaxUint256, collateralAmountInUSD, borrowAmountInUSD);
    }
    function _baseTest(
        bool isDirect,
        bool takeMaxUint256,
        uint256 collateralAmountInUSD,
        uint256 borrowAmountInUSD
    ) internal {
        for (uint256 i = 0; i < vaults.length; ++i) {
        }
    }

}