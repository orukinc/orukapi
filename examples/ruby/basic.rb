#!/usr/bin/env ruby
# Basic oruk usage: public feed -> authed list -> pagination.
#
#   export ORUK_API_KEY=ork_xxxxxxxx
#   ruby basic.rb
require_relative 'oruk_client'

oruk = OrukClient.new(ENV['ORUK_API_KEY'])

puts '=== /v1/stories/feed (public) ==='
oruk.feed(limit: 5, sort: 'recent')['stories'].each do |s|
  puts "[#{s['id']}] #{(s['urgency'] || '?').ljust(9)} #{s['headline']}"
  puts "   sources=#{s.dig('corroboration','count') || 0} impact=#{s['impact'] || '?'} city=#{s['eventCity'] || '?'}"
end

unless ENV['ORUK_API_KEY']
  puts; puts 'Set ORUK_API_KEY to see the authed examples.'; exit
end

puts; puts '=== /v1/stories?category=conflict&min_impact=7 ==='
oruk.stories(category: 'conflict', min_impact: 7, limit: 5)['stories'].each do |s|
  puts "[#{(s['impact'] || 0).to_s.rjust(2)}] #{s['headline']}"
end

puts; puts '=== Paging through last 7 days of economy stories (max 25) ==='
since = (Time.now.utc - 7 * 24 * 3600).strftime('%Y-%m-%dT%H:%M:%SZ')
count = 0
oruk.each_page(category: 'economy', since: since, limit: 50) do |s|
  count += 1
  puts "  #{s['headline']}" if count <= 5
  break if count >= 25
end
puts; puts "Pulled #{count} stories across pages."

puts; puts '=== /v1/stats ==='
stats = oruk.stats
puts "Active sources: #{stats['activeSources'] || 0}"
puts "Stories total:  #{stats['storiesTotal'] || 0}"
puts 'Top categories:'
(stats['topCategories'] || []).first(5).each do |c|
  puts "  #{(c['category'] || '?').ljust(12)} #{c['count'] || 0}"
end
