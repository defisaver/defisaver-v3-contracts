// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;

import "../interfaces/chainlink/IAggregatorV3.sol";

contract PriceFeedRegistryL2 {
  address public constant USD = address(840);

  mapping(address => mapping(address => address)) public aggregators;

  // feedRegistry.getFeed(tokenAddr, Denominations.USD)
  // feedRegistry.latestRoundData(_inputTokenAddr, Denominations.USD) returns (uint80, int256 answer, uint256, uint256, uint80){
  constructor (){
    setOptimismAggregators();
  }

  function getFeed(
    address base,
    address quote
  )
    public
    view
    returns (
      address aggregator
    )
  {
    aggregator = aggregators[base][quote];
    require(address(aggregator) != address(0), "Feed not found");
  }

  function setFeed(
    address base,
    address quote,
    address aggregator
  )
    public
  {
    aggregators[base][quote] = aggregator;
  }

  function latestRoundData(
    address base,
    address quote
  )
    public
    view
    returns (
      uint80 roundId,
      int256 answer,
      uint256 startedAt,
      uint256 updatedAt,
      uint80 answeredInRound
    )
  {
    address aggregator = getFeed(base, quote);
    return IAggregatorV3(aggregator).latestRoundData();
  }
  function setArbitrumAggregators() internal {
    // BTC
    aggregators[0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB][USD] = 0x6ce185860a4963106506C203335A2910413708e9;
    // ETH
    aggregators[0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE][USD] = 0x639Fe6ab55C921f74e7fac1ee960C0B6293ba612;
    // WETH
    aggregators[0x82aF49447D8a07e3bd95BD0d56f35241523fBab1][USD] = 0x639Fe6ab55C921f74e7fac1ee960C0B6293ba612;
    // USDC
    aggregators[0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8][USD] = 0x50834F3163758fcC1Df9973b6e91f0F0F0434aD3;
    // USDT
    aggregators[0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9][USD] = 0x3f3f5dF88dC9F13eac63DF89EC16ef6e7E25DdE7;
    // DAI
    aggregators[0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1][USD] = 0xc5C8E77B397E531B8EC06BFb0048328B30E9eCfB;
    // LINK
    aggregators[0xf97f4df75117a78c1A5a0DBb814Af92458539FB4][USD] = 0x86E53CF1B870786351Da77A57575e79CB55812CB;
    // FRAX
    aggregators[0x17FC002b466eEc40DaE837Fc4bE5c67993ddBd6F][USD] = 0x0809E3d38d1B4214958faf06D8b1B1a2b73f2ab8;
    // KNC
    aggregators[0xe4DDDfe67E7164b0FE14E218d80dC4C08eDC01cB][USD] = 0xbF539d4c2106dd4D9AB6D56aed3d9023529Db145;
    // SUSHI
    aggregators[0xd4d42F0b6DEF4CE0383636770eF773390d85c61A][USD] = 0xb2A8BA74cbca38508BA1632761b56C897060147C;
    // UNI
    aggregators[0xFa7F8980b0f1E64A2062791cc3b0871572f1F7f0][USD] = 0x9C917083fDb403ab5ADbEC26Ee294f6EcAda2720;
    // ARB
    aggregators[0x912CE59144191C1204E64559FE8253a0e49E6548][USD] = 0xb2A824043730FE05F3DA2efaFa1CBbe83fa548D6;
    // BAL
    aggregators[0x040d1EdC9569d4Bab2D15287Dc5A4F10F56a56B8][USD] = 0xBE5eA816870D11239c543F84b71439511D70B94f;
    // CRV
    aggregators[0x11cDb42B0EB46D95f990BeDD4695A6e3fA034978][USD] = 0xaebDA2c976cfd1eE1977Eac079B4382acb849325;
    // GMX
    aggregators[0xfc5A1A6EB076a2C7aD06eD22C90d7E710E35ad0a][USD] = 0xDB98056FecFff59D032aB628337A4887110df3dB;
    // LUSD
    aggregators[0x93b346b6BC2548dA6A1E7d98E9a421B42541425b][USD] = 0x0411D28c94d85A36bC72Cb0f875dfA8371D8fFfF;
    // WBTC 
    aggregators[0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f][USD] = 0xd0C7101eACbB49F3deCcCc166d238410D6D46d57;

    // CBETH / ETH
    aggregators[0x1DEBd73E752bEaF79865Fd6446b0c970EaE7732f][0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE] = 0xa668682974E3f121185a3cD94f00322beC674275;
    // RETH / ETH
    aggregators[0xEC70Dcb4A1EFa46b8F2D97C310C9c4790ba5ffA8][0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE] = 0xF3272CAfe65b190e76caAF483db13424a3e23dD2;


  }

  function setOptimismAggregators() internal {
    // BTC
    aggregators[0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB][USD] = 0xD702DD976Fb76Fffc2D3963D037dfDae5b04E593;
    // ETH
    aggregators[0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE][USD] = 0x13e3Ee699D1909E989722E753853AE30b17e08c5;  
    // WETH 
    aggregators[0x4200000000000000000000000000000000000006][USD] = 0x13e3Ee699D1909E989722E753853AE30b17e08c5;
    // DAI
    aggregators[0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1][USD] = 0x8dBa75e83DA73cc766A7e5a0ee71F656BAb470d6;
    // USDC
    aggregators[0x7F5c764cBc14f9669B88837ca1490cCa17c31607][USD] = 0x16a9FA2FDa030272Ce99B29CF780dFA30361E0f3;
    // USDT 
    aggregators[0x94b008aA00579c1307B0EF2c499aD98a8ce58e58][USD] = 0xECef79E109e997bCA29c1c0897ec9d7b03647F5E;
    // AAVE 
    aggregators[0x76FB31fb4af56892A25e32cFC43De717950c9278][USD] = 0x338ed6787f463394D24813b297401B9F05a8C9d1;
    // CRV
    aggregators[0x0994206dfE8De6Ec6920FF4D779B0d950605Fb53][USD] = 0xbD92C6c284271c227a1e0bF1786F468b539f51D9;
    // KNC
    aggregators[0xa00E3A3511aAC35cA78530c85007AFCd31753819][USD] = 0xCB24d22aF35986aC1feb8874AdBbDF68f6dC2e96;
    // LINK
    aggregators[0x350a791Bfc2C21F9Ed5d10980Dad2e2638ffa7f6][USD] = 0x13e3Ee699D1909E989722E753853AE30b17e08c5;
    // SNX
    aggregators[0x8700dAec35aF8Ff88c16BdF0418774CB3D7599B4][USD] = 0x2FCF37343e916eAEd1f1DdaaF84458a359b53877;
    // UNI
    aggregators[0x6fd9d7AD17242c41f7131d257212c54A0e816691][USD] = 0x11429eE838cC01071402f21C219870cbAc0a59A0;
    // BUSD
    aggregators[0x9C9e5fD8bbc25984B178FdCE6117Defa39d2db39][USD] = 0xC1cB3b7cbB3e786aB85ea28489f332f4FAEd5Bc4;
    // FRAX
    aggregators[0x2E3D870790dC77A83DD1d18184Acc7439A53f475][USD] = 0xc7D132BeCAbE7Dcc4204841F33bae45841e41D9C;
    // OP
    aggregators[0x4200000000000000000000000000000000000042][USD] = 0x0D276FC14719f9292D5C1eA2198673d1f4269246;
    // SUSD
    aggregators[0x8c6f28f2F1A3C87F0f938b96d27520d9751ec8d9][USD] = 0x7f99817d87baD03ea21E05112Ca799d715730efe;
    // WBTC
    aggregators[0x68f180fcCe6836688e9084f035309E29Bf0A2095][USD] = 0x718A5788b89454aAE3A028AE9c111A29Be6c2a6F;
    // wstETH
    aggregators[0x1F32b1c2345538c0c6f582fCB022739c4A194Ebb][USD] = 0x698B585CbC4407e2D54aa898B2600B53C68958f7;
  }
}