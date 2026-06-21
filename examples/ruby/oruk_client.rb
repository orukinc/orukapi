# OrukClient — minimal Net::HTTP-based client for the oruk live broadcast
# intelligence API. Standard library only.
#
#   oruk = OrukClient.new(ENV['ORUK_API_KEY'])
#   oruk.stories(category: 'conflict', min_impact: 7)['stories'].each do |s|
#     puts s['headline']
#   end

require 'net/http'
require 'uri'
require 'json'

class OrukAPIError < StandardError
  attr_reader :status, :code, :request_id
  def initialize(status, code, message, request_id = nil)
    @status, @code, @request_id = status, code, request_id
    super("oruk API: #{code} — #{message}")
  end
end

class OrukClient
  BASE_URL = 'https://api.oruk.ai'

  def initialize(api_key = nil, base_url: BASE_URL, timeout: 15)
    @api_key, @base_url, @timeout = api_key, base_url.chomp('/'), timeout
  end

  def feed(**params)    = get('/v1/stories/feed', params, requires_key: false)
  def stories(**params) = get('/v1/stories', params)
  def story(id)         = get("/v1/stories/#{URI.encode_www_form_component(id)}")
  def sources(**p)      = get('/v1/sources', p)
  def regions           = get('/v1/regions')
  def stats             = get('/v1/stats')
  def health            = get('/v1/health', {}, requires_key: false)

  # Yields every story across all pages.
  def each_page(**params)
    return to_enum(:each_page, **params) unless block_given?
    cursor = nil
    loop do
      page = stories(**(cursor ? params.merge(cursor: cursor) : params))
      (page['stories'] || []).each { |s| yield s }
      meta = page['meta'] || {}
      break unless meta['hasMore'] && meta['cursor']
      cursor = meta['cursor']
    end
  end

  private

  def get(path, params = {}, requires_key: true)
    raise "ORUK_API_KEY required for #{path}" if requires_key && @api_key.nil?

    uri = URI.parse(@base_url + path)
    uri.query = URI.encode_www_form(params.compact) unless params.empty?

    req = Net::HTTP::Get.new(uri)
    req['Accept'] = 'application/json'
    req['User-Agent'] = 'oruk-ruby-example/1.0'
    req['X-API-Key'] = @api_key if @api_key

    resp = Net::HTTP.start(uri.hostname, uri.port,
                           use_ssl: true,
                           open_timeout: 5,
                           read_timeout: @timeout) { |http| http.request(req) }

    if resp.code.to_i >= 400
      body = (JSON.parse(resp.body) rescue {})
      raise OrukAPIError.new(
        resp.code.to_i,
        body['error'] || 'http_error',
        body['message'] || "HTTP #{resp.code} from #{path}",
        resp['x-request-id'],
      )
    end
    JSON.parse(resp.body)
  end
end
