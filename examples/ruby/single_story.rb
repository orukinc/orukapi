#!/usr/bin/env ruby
# Print one story with full timeline + verbatim source quotes.
#
#   export ORUK_API_KEY=ork_xxxxxxxx
#   ruby single_story.rb evt_8f3a2b
require_relative 'oruk_client'

abort 'usage: ruby single_story.rb <evt_id>' if ARGV.empty?
abort 'Set ORUK_API_KEY first.' unless ENV['ORUK_API_KEY']

story = OrukClient.new(ENV['ORUK_API_KEY']).story(ARGV[0])
rule = '═' * 70

puts "╔#{rule}╗"
puts "  #{story['headline']}"
puts "╚#{rule}╝"
puts; puts story['summary']; puts
puts "Category:   #{story['category']}  (also: #{(story['categories'] || []).join(', ')})"
puts "Urgency:    #{story['urgency']}"
puts "Impact:     #{story['impact'] || 0} / 10"
puts "Confidence: #{format('%.2f', story['confidence'] || 0)}"
puts "Location:   #{story['eventCity'] || '?'}, #{story['eventCountry'] || '?'} (#{story['eventRegion'] || '?'})"

corrob = story['corroboration'] || {}
puts; puts "— Corroboration: #{corrob['count'] || 0} independent sources —"
(corrob['sourceDetails'] || []).each do |sd|
  puts "  • #{(sd['name'] || '').ljust(22)} (#{sd['region']}, #{sd['language']}, #{sd['medium']})"
end

puts; puts '— Timeline of developments —'
(story['timeline'] || []).each { |t| puts "  #{t['at']}  #{t['text']}" }

puts; puts '— Verbatim source quotes —'
(story['sources'] || []).each do |s|
  puts "  [#{s['station']}]"
  puts %(  "#{s['quote']}")
  puts
end

puts; puts "Canonical URL: https://oruk.ai/story/#{story['id']}"
