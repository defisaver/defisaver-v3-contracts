
import { FluidHelper } from "../../../contracts/actions/fluid/helpers/FluidHelper.sol";
import { IFluidVaultT1 } from "../../../contracts/interfaces/fluid/IFluidVaultT1.sol";

contract FluidTestHelper is FluidHelper {

    function getT1Vaults() internal pure returns (IFluidVaultT1[] memory vaults) {
        vaults = new IFluidVaultT1[](6);
        vaults[0] = IFluidVaultT1(0x1982CC7b1570C2503282d0A0B41F69b3B28fdcc3); // id:14 - wstETH/USDC
        vaults[1] = IFluidVaultT1(0xb4F3bf2d96139563777C0231899cE06EE95Cc946); // id:15 - wstETH/USDT
        vaults[2] = IFluidVaultT1(0x6F72895Cf6904489Bcd862c941c3D02a3eE4f03e); // id:21 - WBTC/USDC
        vaults[3] = IFluidVaultT1(0x6F72895Cf6904489Bcd862c941c3D02a3eE4f03e); // id:25 - wstETH/WBTC
        vaults[4] = IFluidVaultT1(0x025C1494b7d15aa931E011f6740E0b46b2136cb9); // id:25 - rsETH/wstETH
        vaults[5] = IFluidVaultT1(0x01c7c1c41dea58b043e700eFb23Dc077F12a125e); // id:29 - cbBTC/USDC
    }
}