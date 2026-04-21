update store_products
set price = case theme_key
  when 'fire' then 2000
  when 'snow' then 2000
  when 'bats' then 3000
  when 'royal' then 2000
  when 'dawn' then 3000
  when 'galaxy' then 3000
  when 'sunset_gold' then 1000
  else price
end
where theme_key in ('fire', 'snow', 'bats', 'royal', 'dawn', 'galaxy', 'sunset_gold');