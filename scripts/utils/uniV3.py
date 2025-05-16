import math

Q_96 = 2**96
WAD = 10**18

def price_to_sqrtp(p):
    return int(math.sqrt(p) * Q_96)
def tick(p):
    return math.floor(math.log(p, 1.0001))
def liquidity0(amount, pa, pb):
    if pa > pb:
        pa, pb = pb, pa
    return (amount * (pa * pb) / Q_96) / (pb - pa)
def liquidity1(amount, pa, pb):
    if pa > pb:
        pa, pb = pb, pa
    return amount * Q_96 / (pb - pa)
def calc_amount0(liq, pa, pb):
    if pa > pb:
        pa, pb = pb, pa
    return int(liq * Q_96 * (pb - pa) / pa / pb)
def calc_amount1(liq, pa, pb):
    if pa > pb:
        pa, pb = pb, pa
    return int(liq * (pb - pa) / Q_96)

def print_liquidity_data(*, lowPrice, currPrice, uppPrice, amount_y, amount_x):
    print('--------------------------------');
    sqrt_low = price_to_sqrtp(lowPrice)
    sqrt_cur = price_to_sqrtp(currPrice)
    sqrt_upp = price_to_sqrtp(uppPrice)

    print(f'sqrt_low: {sqrt_low}')
    print(f'sqrt_cur: {sqrt_cur}')
    print(f'sqrt_upp: {sqrt_upp}')

    lowTick = tick(lowPrice)
    curTick = tick(currPrice)
    uppTick = tick(uppPrice)

    print(f'lowTick: {lowTick}')
    print(f'curTick: {curTick}')
    print(f'uppTick: {uppTick}')

    liq0 = liquidity0(amount_y, sqrt_cur, sqrt_upp)
    liq1 = liquidity1(amount_x, sqrt_cur, sqrt_low)
    liq = int(min(liq0, liq1))

    print(f'liq: {liq}')

    amount0 = calc_amount0(liq, sqrt_upp, sqrt_cur)
    amount1 = calc_amount1(liq, sqrt_low, sqrt_cur)

    print(f'amount0: {amount0}')
    print(f'amount1: {amount1}')

#############################################################################
# y = eth
# x = bold
# 1 ETH = 2600 BOLD
print_liquidity_data(
    lowPrice = 2500,
    currPrice = 2600,
    uppPrice = 2700,
    amount_y = 100000000 * WAD,
    amount_x = 100000000 * 2600 * WAD
)

# y = dai
# x = bold
# 1 DAI = 1 BOLD
print_liquidity_data(
    lowPrice = 0.99,
    currPrice = 1,
    uppPrice = 1.01,
    amount_y = 100000000 * WAD,
    amount_x = 100000000 * WAD
)