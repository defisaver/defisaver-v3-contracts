// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { BaseTest } from "../utils/BaseTest.sol";
import { AaveView } from "../../contracts/views/AaveView.sol";
import {
    IAaveProtocolDataProviderV2
} from "../../contracts/interfaces/protocols/aaveV2/IAaveProtocolDataProviderV2.sol";
import {
    ILendingPoolAddressesProviderV2
} from "../../contracts/interfaces/protocols/aaveV2/ILendingPoolAddressesProviderV2.sol";

contract TestAaveView is BaseTest {
    AaveView cut;

    /// @dev Aave V2 LendingPoolAddressesProvider on mainnet
    address internal constant AAVE_V2_MARKET = 0xB53C1a33016B2DC2fF3653530bfF1848a515c8c5;
    address internal constant USER = 0xECf1839269f9240F9b897e38C092b1740A4c316D;

    address internal constant STETH = 0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84;
    address internal constant REN = 0x408e41876cCCDC0F92210600ef50372656052a38;

    bytes32 internal constant DATA_PROVIDER_ID =
        0x0100000000000000000000000000000000000000000000000000000000000000;

    function setUp() public override {
        forkMainnetLatest();
        cut = new AaveView();
    }

    function test_getLoanData_does_not_revert() public view {
        AaveView.LoanData memory data = cut.getLoanData(AAVE_V2_MARKET, USER);
        assertEq(data.user, USER);
    }

    function test_getTokensInfo_stETH_and_REN() public view {
        address[] memory tokens = new address[](2);
        tokens[0] = STETH;
        tokens[1] = REN;

        AaveView.TokenInfo[] memory infos = cut.getTokensInfo(AAVE_V2_MARKET, tokens);

        assertEq(infos.length, 2);
        assertEq(infos[0].underlyingTokenAddress, STETH);
        assertEq(infos[1].underlyingTokenAddress, REN);
        assertTrue(infos[0].price > 0);
        assertTrue(infos[1].price == 0);
    }

    function test_getTokenInfoFull_stETH() public view {
        address dataProviderAddr =
            ILendingPoolAddressesProviderV2(AAVE_V2_MARKET).getAddress(DATA_PROVIDER_ID);
        address priceOracle = ILendingPoolAddressesProviderV2(AAVE_V2_MARKET).getPriceOracle();
        IAaveProtocolDataProviderV2 dataProvider = IAaveProtocolDataProviderV2(dataProviderAddr);

        AaveView.TokenInfoFull memory info = cut.getTokenInfoFull(dataProvider, priceOracle, STETH);

        assertEq(info.underlyingTokenAddress, STETH);
        assertTrue(info.price > 0);
        assertTrue(info.totalSupply > 0);
    }

    function test_getTokenInfoFull_REN() public view {
        address dataProviderAddr =
            ILendingPoolAddressesProviderV2(AAVE_V2_MARKET).getAddress(DATA_PROVIDER_ID);
        address priceOracle = ILendingPoolAddressesProviderV2(AAVE_V2_MARKET).getPriceOracle();
        IAaveProtocolDataProviderV2 dataProvider = IAaveProtocolDataProviderV2(dataProviderAddr);

        AaveView.TokenInfoFull memory info = cut.getTokenInfoFull(dataProvider, priceOracle, REN);

        assertEq(info.underlyingTokenAddress, REN);
        assertTrue(info.price == 0);
    }
}
