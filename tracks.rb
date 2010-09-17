require 'rubygems'
require 'sinatra'

get "/:tracka/:trackb" do
  erb :show
end

get "/infopi" do
  erb :show
end